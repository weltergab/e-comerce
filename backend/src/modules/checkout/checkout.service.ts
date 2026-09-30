import { randomUUID } from 'node:crypto';
import { enqueueDeferredTask } from '../../background/queue';
import { getEnv } from '../../config/env';
import { db } from '../../db/client';
import { checkoutPaymentMethods, stripe } from '../../payments/stripe';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import type { AccessClaims } from '../auth/auth.types';
import type { CheckoutItemInput, ShippingAddressInput } from './checkout.schemas';

interface CatalogRow {
  id: string;
  name: string;
  price: number | string;
  currency: string;
  images: string[] | null;
  active: boolean;
  stripe_price_id: string;
}

interface PricedItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  image: string;
}

function storedItems(items: Array<Record<string, unknown>>): PricedItem[] {
  return items.map((item) => ({
    productId: String(item.product_id),
    name: String(item.product_name),
    unitPrice: Number(item.unit_price),
    currency: String(item.currency),
    quantity: Number(item.quantity),
    image: typeof item.image_url === 'string' ? item.image_url : '',
  }));
}

function checkoutSuccessUrl(orderId: string) {
  return `${getEnv().frontendUrl}/checkout/success?order_id=${encodeURIComponent(orderId)}`;
}

function existingCheckoutResponse(
  order: { id: string; amount: number | string; currency: string },
  items: Array<Record<string, unknown>>,
  checkoutUrl: string | null,
) {
  return {
    orderId: order.id,
    checkoutUrl,
    amount: Number(order.amount),
    currency: order.currency,
    items: storedItems(items),
  };
}

async function existingCheckout(userId: string, key: string) {
  const { data, error } = await db().from('orders')
    .select('id,amount,currency,stripe_checkout_session_id,stripe_payment_intent_id,order_status,payment_status')
    .eq('user_id', userId)
    .eq('idempotency_key', key)
    .maybeSingle();
  if (error) throw new AppError(500, 'ORDER_READ_FAILED', 'Não foi possível consultar o checkout.');
  if (!data) return null;
  if (data.order_status === 'canceled') throw new AppError(409, 'CHECKOUT_EXPIRED', 'Este checkout expirou. Inicie outro pagamento.');
  const { data: items, error: itemsError } = await db().from('order_items').select('product_id,product_name,unit_price,currency,quantity,image_url').eq('order_id', data.id);
  if (itemsError) throw new AppError(500, 'ORDER_ITEMS_READ_FAILED', 'Não foi possível consultar os itens do checkout.');

  if (data.stripe_checkout_session_id) {
    const session = await stripe().checkout.sessions.retrieve(data.stripe_checkout_session_id);
    if (session.status === 'expired') {
      await db().rpc('release_order_reservation', { p_order_id: data.id, p_reason: 'expired' });
      throw new AppError(409, 'CHECKOUT_EXPIRED', 'Este checkout expirou. Inicie outro pagamento.');
    }
    const checkoutUrl = session.status === 'complete' || data.payment_status === 'succeeded'
      ? checkoutSuccessUrl(data.id)
      : session.url;
    if (!checkoutUrl) throw new AppError(409, 'CHECKOUT_UNAVAILABLE', 'Este checkout não está mais disponível.');
    return existingCheckoutResponse(data, items || [], checkoutUrl);
  }

  // Pedidos abertos pela integração anterior não podem ser reutilizados por
  // Checkout Sessions. Encerre-os de forma compensada e force uma nova chave.
  if (data.stripe_payment_intent_id) {
    const payment = await stripe().paymentIntents.retrieve(data.stripe_payment_intent_id);
    if (payment.status === 'succeeded' || payment.status === 'processing') {
      return existingCheckoutResponse(data, items || [], checkoutSuccessUrl(data.id));
    }
    const canceled = await stripe().paymentIntents.cancel(payment.id).catch(() => null);
    if (canceled?.status === 'canceled') {
      await db().rpc('release_order_reservation', { p_order_id: data.id, p_reason: 'payment_creation_failed' });
      throw new AppError(409, 'CHECKOUT_EXPIRED', 'O checkout anterior foi encerrado. Tente novamente.');
    }
    return existingCheckoutResponse(data, items || [], checkoutSuccessUrl(data.id));
  }

  return existingCheckoutResponse(data, items || [], null);
}

export async function createCheckout(input: {
  user: AccessClaims;
  items: CheckoutItemInput[];
  shippingAddress: ShippingAddressInput;
  idempotencyKey: string;
}) {
  const existing = await existingCheckout(input.user.userId, input.idempotencyKey);
  if (existing?.checkoutUrl) return existing;

  const ids = input.items.map((item) => item.productId);
  const { data, error } = await db().from('products').select('id,name,price,currency,images,active,stripe_price_id').in('id', ids);
  if (error) throw new AppError(500, 'CATALOG_READ_FAILED', 'Não foi possível validar o carrinho.');
  const rows = (data || []) as CatalogRow[];
  if (rows.length !== ids.length) throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'Um ou mais produtos não estão disponíveis.');

  const byId = new Map(rows.map((row) => [row.id, row]));
  const pricedItems: PricedItem[] = input.items.map((item) => {
    const product = byId.get(item.productId)!;
    const unitPrice = Number(product.price);
    if (!product.active || !product.stripe_price_id || product.currency !== 'brl' || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new AppError(409, 'PRODUCT_UNAVAILABLE', `${product.name} não está disponível para venda.`);
    }
    return { productId: product.id, name: product.name, quantity: item.quantity, unitPrice, currency: product.currency, image: product.images?.[0] || '' };
  });
  const amount = existing?.amount ?? Math.round(pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100) / 100;
  const currency = existing?.currency ?? 'brl';
  let orderId = existing?.orderId || randomUUID();
  const reservationExpiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  if (!existing) {
    const { data: reservedOrderId, error: reserveError } = await db().rpc('create_checkout_order', {
      p_order_id: orderId,
      p_user_id: input.user.userId,
      p_user_email: input.user.email,
      p_user_name: input.user.username,
      p_idempotency_key: input.idempotencyKey,
      p_items: pricedItems,
      p_amount: amount,
      p_currency: currency,
      p_shipping_address: input.shippingAddress,
      p_expires_at: reservationExpiresAt,
    });
    if (reserveError) {
      if (reserveError.message.includes('INSUFFICIENT_STOCK')) throw new AppError(409, 'INSUFFICIENT_STOCK', 'Estoque insuficiente para um dos produtos.');
      throw new AppError(409, 'ORDER_CREATE_FAILED', 'Não foi possível reservar os itens do pedido.');
    }
    if (typeof reservedOrderId === 'string') orderId = reservedOrderId;
  }

  let checkoutSessionId: string | undefined;
  let failureStage: 'checkout-session' | 'order-association' | 'reservation-scheduling' = 'checkout-session';
  try {
    const paymentMethodTypes = await checkoutPaymentMethods();
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'hosted_page',
      locale: 'pt-BR',
      line_items: pricedItems.map((item) => ({
        price_data: {
          currency: item.currency,
          unit_amount: Math.round(item.unitPrice * 100),
          product_data: { name: item.name },
        },
        quantity: item.quantity,
      })),
      payment_method_types: paymentMethodTypes,
      payment_method_options: paymentMethodTypes.includes('pix')
        ? { pix: { expires_after_seconds: 900 } }
        : undefined,
      customer_email: input.user.email,
      client_reference_id: orderId,
      metadata: { orderId, userId: input.user.userId },
      payment_intent_data: {
        description: `Pedido ${orderId}`,
        metadata: { orderId, userId: input.user.userId },
      },
      success_url: checkoutSuccessUrl(orderId),
      cancel_url: `${getEnv().frontendUrl}/checkout?canceled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    }, { idempotencyKey: orderId });
    checkoutSessionId = session.id;
    if (!session.url) throw new Error('Checkout Session sem URL');
    failureStage = 'order-association';
    const { error: associationError } = await db().from('orders')
      .update({ stripe_checkout_session_id: session.id, payment_status: 'requires_payment_method' })
      .eq('id', orderId);
    if (associationError) throw associationError;
    failureStage = 'reservation-scheduling';
    await enqueueDeferredTask({ type: 'reservation-expiry', orderId }, reservationExpiresAt);
    return { orderId, checkoutUrl: session.url, amount, currency, items: pricedItems };
  } catch (cause) {
    logger.error('checkout_initialization_failed', {
      orderId,
      stage: failureStage,
      error: cause instanceof Error ? cause.message : String(cause),
    });
    if (checkoutSessionId) await stripe().checkout.sessions.expire(checkoutSessionId).catch(() => undefined);
    await db().rpc('release_order_reservation', { p_order_id: orderId, p_reason: 'payment_creation_failed' });
    throw new AppError(502, 'CHECKOUT_SESSION_CREATE_FAILED', 'Não foi possível iniciar o pagamento. Tente novamente.');
  }
}
