import { db } from '../../db/client';
import { AppError } from '../../shared/errors';
import { enqueueDeferredTask } from '../../background/queue';
import { DAY_SECONDS } from '../../background/tasks';
import { getEnv } from '../../config/env';

function formatOrder(order: Record<string, unknown>, items: Array<Record<string, unknown>>) {
  return {
    id: order.id,
    userEmail: order.user_email,
    userName: order.user_name,
    stripeCheckoutSessionId: order.stripe_checkout_session_id,
    stripePaymentIntentId: order.stripe_payment_intent_id,
    amount: Number(order.amount),
    currency: order.currency,
    status: order.payment_status,
    orderStatus: order.order_status,
    paymentMethod: order.payment_method,
    products: items.map((item) => ({
      id: item.product_id,
      name: item.product_name,
      price: Number(item.unit_price),
      currency: item.currency,
      qty: item.quantity,
      image: item.image_url,
    })),
    shippingAddress: order.shipping_address,
    trackingCode: order.tracking_code,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    adminNotes: order.admin_notes,
    adminNotesUpdatedAt: order.admin_notes_updated_at,
    adminNotesUpdatedBy: order.admin_notes_updated_by,
  };
}

export async function updateFulfillment(orderId: string, status: unknown, trackingCode: unknown) {
  if (!['packing', 'shipped', 'delivered'].includes(String(status))) {
    throw new AppError(400, 'INVALID_FULFILLMENT_STATUS', 'Status de entrega inválido.');
  }
  const tracking = typeof trackingCode === 'string' ? trackingCode.trim().slice(0, 160) : '';
  if (status === 'delivered') {
    const notBefore = new Date(Date.now() + getEnv().piiRetentionDays * DAY_SECONDS * 1000).toISOString();
    await enqueueDeferredTask({ type: 'order-pii-redaction', orderId }, notBefore);
  }
  const { error } = await db().rpc('update_order_fulfillment', { p_order_id: orderId, p_next_status: status, p_tracking_code: tracking });
  if (error) throw new AppError(409, 'INVALID_FULFILLMENT_TRANSITION', 'A transição de entrega não é permitida.');
}

async function itemsForOrders(orderIds: string[]) {
  if (!orderIds.length) return new Map<string, Array<Record<string, unknown>>>();
  const { data, error } = await db().from('order_items').select('*').in('order_id', orderIds);
  if (error) throw new AppError(500, 'ORDER_ITEMS_READ_FAILED', 'Não foi possível consultar os itens.');
  const result = new Map<string, Array<Record<string, unknown>>>();
  for (const item of data || []) {
    const values = result.get(item.order_id) || [];
    values.push(item);
    result.set(item.order_id, values);
  }
  return result;
}

export async function orderStatus(orderId: string, userId: string) {
  const { data, error } = await db().from('orders').select('id,order_status,payment_status,amount,currency,created_at,updated_at').eq('id', orderId).eq('user_id', userId).maybeSingle();
  if (error) throw new AppError(500, 'ORDER_READ_FAILED', 'Não foi possível consultar o pedido.');
  if (!data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
  return { id: data.id, orderStatus: data.order_status, paymentStatus: data.payment_status, amount: Number(data.amount), currency: data.currency, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function listUserOrders(userId: string, limit: number, cursor?: string) {
  let query = db().from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit + 1);
  if (cursor) query = query.lt('created_at', cursor);
  const { data, error } = await query;
  if (error) throw new AppError(500, 'ORDERS_READ_FAILED', 'Não foi possível consultar os pedidos.');
  const page = (data || []).slice(0, limit);
  const items = await itemsForOrders(page.map((order) => order.id));
  return { orders: page.map((order) => formatOrder(order, items.get(order.id) || [])), nextCursor: (data || []).length > limit ? page.at(-1)?.created_at || null : null };
}

export async function listAdminOrders(input: { limit: number; cursor?: string; startDate?: string; endDate?: string; status?: string }) {
  let query = db().from('orders').select('*').order('created_at', { ascending: false }).limit(input.limit + 1);
  if (input.cursor) query = query.lt('created_at', input.cursor);
  if (input.startDate) query = query.gte('created_at', `${input.startDate}T00:00:00.000Z`);
  if (input.endDate) query = query.lte('created_at', `${input.endDate}T23:59:59.999Z`);
  if (input.status) query = query.eq('payment_status', input.status);
  const { data, error } = await query;
  if (error) throw new AppError(500, 'ORDERS_READ_FAILED', 'Não foi possível consultar os pedidos.');
  const page = (data || []).slice(0, input.limit);
  const items = await itemsForOrders(page.map((order) => order.id));
  return { orders: page.map((order) => formatOrder(order, items.get(order.id) || [])), nextCursor: (data || []).length > input.limit ? page.at(-1)?.created_at || null : null };
}

export async function updateAdminNotes(orderId: string, adminId: string, notes: unknown) {
  if (notes !== null && notes !== undefined && typeof notes !== 'string') throw new AppError(400, 'INVALID_ADMIN_NOTES', 'Notas devem ser texto.');
  const value = typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 5000) : null;
  const { data, error } = await db().from('orders').update({ admin_notes: value, admin_notes_updated_at: value ? new Date().toISOString() : null, admin_notes_updated_by: value ? adminId : null }).eq('id', orderId).select('*').maybeSingle();
  if (error) throw new AppError(500, 'ORDER_UPDATE_FAILED', 'Não foi possível atualizar o pedido.');
  if (!data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
  const items = await itemsForOrders([orderId]);
  return formatOrder(data, items.get(orderId) || []);
}
