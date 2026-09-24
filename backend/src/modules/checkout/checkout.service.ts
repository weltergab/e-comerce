import { randomUUID } from 'node:crypto';
import { db } from '../../db/client';
import { stripe } from '../../payments/stripe';
import { AppError } from '../../shared/errors';
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

async function existingCheckout(userId: string, key: string) {
  const { data } = await db().from('orders').select('id,amount,currency,stripe_payment_intent_id,order_status').eq('user_id', userId).eq('idempotency_key', key).maybeSingle();
  if (!data) return null;
  if (data.order_status === 'canceled') throw new AppError(409, 'CHECKOUT_EXPIRED', 'Este checkout expirou. Inicie outro pagamento.');
  const { data: items } = await db().from('order_items').select('product_id,product_name,unit_price,currency,quantity,image_url').eq('order_id', data.id);
  const payment = data.stripe_payment_intent_id ? await stripe().paymentIntents.retrieve(data.stripe_payment_intent_id) : null;
  return {
    orderId: data.id,
    clientSecret: payment?.client_secret,
    amount: Number(data.amount),
    currency: data.currency,
    items: (items || []).map((item) => ({ productId: item.product_id, name: item.product_name, unitPrice: Number(item.unit_price), currency: item.currency, quantity: item.quantity, image: item.image_url || '' })),
  };
}

export async function createCheckout(input: {
  user: AccessClaims;
  items: CheckoutItemInput[];
  shippingAddress: ShippingAddressInput;
  idempotencyKey: string;
}) {
  const existing = await existingCheckout(input.user.userId, input.idempotencyKey);
  if (existing?.clientSecret) return existing;

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
      p_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    if (reserveError) {
      if (reserveError.message.includes('INSUFFICIENT_STOCK')) throw new AppError(409, 'INSUFFICIENT_STOCK', 'Estoque insuficiente para um dos produtos.');
      throw new AppError(409, 'ORDER_CREATE_FAILED', 'Não foi possível reservar os itens do pedido.');
    }
    if (typeof reservedOrderId === 'string') orderId = reservedOrderId;
  }

  let paymentIntentId: string | undefined;
  try {
    const paymentIntent = await stripe().paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      payment_method_types: ['card', 'pix'],
      payment_method_options: { pix: { expires_after_seconds: 900 } },
      description: `Pedido ${orderId}`,
      metadata: { orderId, userId: input.user.userId },
    }, { idempotencyKey: orderId });
    paymentIntentId = paymentIntent.id;
    if (!paymentIntent.client_secret) throw new Error('PaymentIntent sem client secret');
    const { error: associationError } = await db().from('orders').update({ stripe_payment_intent_id: paymentIntent.id, payment_status: paymentIntent.status }).eq('id', orderId);
    if (associationError) throw associationError;
    return { orderId, clientSecret: paymentIntent.client_secret, amount, currency, items: pricedItems };
  } catch (error) {
    if (paymentIntentId) await stripe().paymentIntents.cancel(paymentIntentId).catch(() => undefined);
    await db().rpc('release_order_reservation', { p_order_id: orderId, p_reason: 'payment_creation_failed' });
    throw new AppError(502, 'PAYMENT_CREATE_FAILED', 'Não foi possível iniciar o pagamento. Tente novamente.');
  }
}
