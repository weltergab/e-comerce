import { enqueueDeferredTask, enqueueTask } from '../src/background/queue';
import { DAY_SECONDS } from '../src/background/tasks';
import { getEnv } from '../src/config/env';
import { db } from '../src/db/client';

const pageSize = 500;

async function pages<T>(load: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>, process: (row: T) => Promise<void>) {
  const rows: T[] = [];
  for (let page = 0; ; page += 1) {
    const from = page * pageSize;
    const { data, error } = await load(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  for (let offset = 0; offset < rows.length; offset += 25) {
    await Promise.all(rows.slice(offset, offset + 25).map(process));
  }
}

function plusDays(date: string, days: number) {
  return new Date(Date.parse(date) + days * DAY_SECONDS * 1000).toISOString();
}

async function run() {
  await pages(
    async (from, to) => db().from('stripe_events').select('event_id').in('processing_status', ['received', 'processing', 'failed']).lt('attempt_count', 10).range(from, to),
    (event) => enqueueTask({ type: 'payment-event', eventId: event.event_id }),
  );
  await pages(
    async (from, to) => db().from('email_notifications').select('order_id').in('status', ['pending', 'failed']).lt('attempt_count', 8).range(from, to),
    (email) => enqueueTask({ type: 'email-delivery', orderId: email.order_id }),
  );
  await pages(
    async (from, to) => db().from('inventory_reservations').select('order_id,expires_at').eq('status', 'reserved').range(from, to),
    (reservation) => enqueueDeferredTask({ type: 'reservation-expiry', orderId: reservation.order_id }, reservation.expires_at),
  );
  await pages(
    async (from, to) => db().from('product_images').select('storage_path,created_at').eq('status', 'pending').range(from, to),
    (image) => enqueueDeferredTask({ type: 'product-image-cleanup', storagePath: image.storage_path }, plusDays(image.created_at, 1)),
  );
  await pages(
    async (from, to) => db().from('orders').select('id,updated_at').in('order_status', ['delivered', 'canceled', 'refunded']).range(from, to),
    (order) => enqueueDeferredTask({ type: 'order-pii-redaction', orderId: order.id }, plusDays(order.updated_at, getEnv().piiRetentionDays)),
  );
  await pages(
    async (from, to) => db().from('orders').select('id,updated_at').eq('payment_status', 'succeeded').eq('order_status', 'paid').range(from, to),
    (order) => enqueueDeferredTask({ type: 'order-fulfillment-check', orderId: order.id }, new Date(Date.parse(order.updated_at) + 30 * 60_000).toISOString()),
  );
  await pages(
    async (from, to) => db().from('refresh_tokens').select('id,expires_at,revoked_at').range(from, to),
    (token) => {
      const expiryCleanup = Date.parse(plusDays(token.expires_at, 30));
      const revocationCleanup = token.revoked_at ? Date.parse(plusDays(token.revoked_at, 30)) : Number.POSITIVE_INFINITY;
      return enqueueDeferredTask({ type: 'refresh-token-cleanup', tokenId: token.id }, new Date(Math.min(expiryCleanup, revocationCleanup)).toISOString());
    },
  );
  await pages(
    async (from, to) => db().from('password_reset_tokens').select('id,expires_at').range(from, to),
    (token) => enqueueDeferredTask({ type: 'password-reset-token-cleanup', tokenId: token.id }, plusDays(token.expires_at, 7)),
  );
}

run().then(() => {
  console.log('Background task backfill completed.');
}).catch((error) => {
  console.error('Background task backfill failed:', error);
  process.exitCode = 1;
});
