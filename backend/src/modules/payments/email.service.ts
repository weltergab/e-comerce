import { db } from '../../db/client';
import { getEnv } from '../../config/env';
import { logger } from '../../shared/logger';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]!));
}

export async function processEmailOutbox(limit = 20) {
  const env = getEnv();
  if (!env.resendApiKey || !env.emailFrom) return { sent: 0, failed: 0, skipped: true };
  const { data } = await db().from('email_notifications').select('*').in('status', ['pending', 'failed']).lt('attempt_count', 8).order('created_at', { ascending: true }).limit(limit);
  let sent = 0;
  let failed = 0;
  for (const email of data || []) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': email.id },
        body: JSON.stringify({
          from: env.emailFrom,
          to: [email.recipient],
          subject: `Pagamento confirmado — pedido ${email.order_id}`,
          html: `<h1>Pagamento confirmado</h1><p>Olá, ${escapeHtml(email.recipient_name || 'cliente')}.</p><p>Recebemos o pagamento do pedido <strong>${escapeHtml(email.order_id)}</strong>.</p>`,
        }),
      });
      if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
      const result = await response.json() as { id?: string };
      await db().from('email_notifications').update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: result.id || null, attempt_count: Number(email.attempt_count) + 1, error_summary: null }).eq('id', email.id);
      sent += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      await db().from('email_notifications').update({ status: 'failed', attempt_count: Number(email.attempt_count) + 1, error_summary: message.slice(0, 500) }).eq('id', email.id);
      logger.error('email_delivery_failed', { orderId: email.order_id, error: message });
      failed += 1;
    }
  }
  return { sent, failed, skipped: false };
}
