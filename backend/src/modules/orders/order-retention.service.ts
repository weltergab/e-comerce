import { db } from '../../db/client';
import { AppError } from '../../shared/errors';
import { DAY_SECONDS } from '../../background/tasks';

const terminalOrderStatuses = new Set(['delivered', 'canceled', 'refunded']);

export async function redactOrderPii(orderId: string, retentionDays: number) {
  const { data: redacted, error } = await db().rpc('redact_order_pii', {
    p_order_id: orderId,
    p_retention_days: retentionDays,
  });
  if (error) throw new AppError(500, 'ORDER_REDACTION_FAILED', 'Não foi possível aplicar a retenção de dados do pedido.');
  if (redacted) return { redacted: true };

  const { data: order, error: readError } = await db().from('orders').select('order_status,updated_at,shipping_address').eq('id', orderId).maybeSingle();
  if (readError) throw new AppError(500, 'ORDER_READ_FAILED', 'Não foi possível consultar o pedido para retenção.');
  if (!order || !terminalOrderStatuses.has(order.order_status) || order.shipping_address?.redacted === true) return { redacted: false };
  return {
    redacted: false,
    retryAt: new Date(Date.parse(order.updated_at) + retentionDays * DAY_SECONDS * 1000).toISOString(),
  };
}
