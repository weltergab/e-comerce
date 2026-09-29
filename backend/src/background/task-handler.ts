import { Sentry } from '../config/monitoring';
import { getEnv } from '../config/env';
import { db } from '../db/client';
import { logger } from '../shared/logger';
import { cleanupOrphanProductImage } from '../modules/catalog/product-images.service';
import { deliverOrderEmail } from '../modules/payments/email.service';
import { expireOrderReservation, processPaymentEvent } from '../modules/payments/payment-events.service';
import { redactOrderPii } from '../modules/orders/order-retention.service';
import { continueDeferredTask, enqueueDeferredTask, enqueueTask } from './queue';
import { DAY_SECONDS, parseBackgroundTask, type BackgroundTask } from './tasks';

const terminalPaymentStatuses = new Set(['failed', 'canceled', 'refunded']);

async function schedulePaymentFollowUps(result: { orderId?: string; paymentStatus?: string; updatedAt?: string }) {
  if (!result.orderId) return;
  if (result.paymentStatus === 'succeeded') {
    await enqueueTask({ type: 'email-delivery', orderId: result.orderId });
    if (result.updatedAt) {
      const notBefore = new Date(Date.parse(result.updatedAt) + 30 * 60_000).toISOString();
      await enqueueDeferredTask({ type: 'order-fulfillment-check', orderId: result.orderId }, notBefore);
    }
  }
  if (result.updatedAt && result.paymentStatus && terminalPaymentStatuses.has(result.paymentStatus)) {
    const notBefore = new Date(Date.parse(result.updatedAt) + getEnv().piiRetentionDays * DAY_SECONDS * 1000).toISOString();
    await enqueueDeferredTask({ type: 'order-pii-redaction', orderId: result.orderId }, notBefore);
  }
}

async function cleanupCredential(task: Extract<BackgroundTask, { type: 'refresh-token-cleanup' | 'password-reset-token-cleanup' }>) {
  if (Date.now() < Date.parse(task.notBefore)) {
    await continueDeferredTask(task);
    return;
  }
  const table = task.type === 'refresh-token-cleanup' ? 'refresh_tokens' : 'password_reset_tokens';
  const { error } = await db().from(table).delete().eq('id', task.tokenId);
  if (error) throw error;
}

export async function processBackgroundTask(input: unknown) {
  const task = parseBackgroundTask(input);
  logger.info('background_task_started', { taskType: task.type });

  if (task.type === 'payment-event') {
    await schedulePaymentFollowUps(await processPaymentEvent(task.eventId));
  } else if (task.type === 'email-delivery') {
    await deliverOrderEmail(task.orderId);
  } else if (task.type === 'reservation-expiry') {
    if (Date.now() < Date.parse(task.notBefore)) await continueDeferredTask(task);
    else await schedulePaymentFollowUps(await expireOrderReservation(task.orderId));
  } else if (task.type === 'product-image-cleanup') {
    if (Date.now() < Date.parse(task.notBefore)) await continueDeferredTask(task);
    else {
      const result = await cleanupOrphanProductImage(task.storagePath);
      if (result.retryAt) await enqueueDeferredTask({ type: task.type, storagePath: task.storagePath }, result.retryAt);
    }
  } else if (task.type === 'order-fulfillment-check') {
    if (Date.now() < Date.parse(task.notBefore)) await continueDeferredTask(task);
    else {
      const { data: order, error } = await db().from('orders').select('payment_status,order_status').eq('id', task.orderId).maybeSingle();
      if (error) throw error;
      if (order?.payment_status === 'succeeded' && order.order_status === 'paid') {
        logger.warn('operational_alert', { metric: 'stalePaidOrders', orderId: task.orderId });
        Sentry.captureMessage('Operational alert: stalePaidOrders', { level: 'warning', extra: { orderId: task.orderId } });
      }
    }
  } else if (task.type === 'order-pii-redaction') {
    if (Date.now() < Date.parse(task.notBefore)) await continueDeferredTask(task);
    else {
      const result = await redactOrderPii(task.orderId, getEnv().piiRetentionDays);
      if (result.retryAt) await enqueueDeferredTask({ type: task.type, orderId: task.orderId }, result.retryAt);
    }
  } else {
    await cleanupCredential(task);
  }

  logger.info('background_task_completed', { taskType: task.type });
}

export function backgroundTaskRetry(error: unknown, deliveryCount: number) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'INVALID_BACKGROUND_TASK') {
    Sentry.captureException(error);
    return { acknowledge: true as const };
  }
  const message = error instanceof Error ? error.message : String(error);
  logger.error('background_task_retry', { deliveryCount, error: message });
  if (deliveryCount === 10) Sentry.captureException(error, { extra: { deliveryCount } });
  return { afterSeconds: Math.min(300, 2 ** deliveryCount * 5) };
}
