import { db } from '../../db/client';
import { getEnv } from '../../config/env';
import { logger } from '../../shared/logger';
import { Sentry } from '../../config/monitoring';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]!));
}

export async function deliverOrderEmail(orderId: string) {
  const env = getEnv();
  if (!env.resendApiKey || !env.emailFrom) return { sent: false, skipped: true };
  const { data: email, error } = await db().from('email_notifications').select('*').eq('order_id', orderId).eq('template', 'order_paid').maybeSingle();
  if (error) throw error;
  if (!email || email.status === 'sent') return { sent: email?.status === 'sent', skipped: true };
  if (Number(email.attempt_count) >= 8) {
    logger.error('email_delivery_attempts_exhausted', { orderId });
    Sentry.captureMessage('Email delivery attempts exhausted', { level: 'error', extra: { orderId } });
    return { sent: false, skipped: true, exhausted: true };
  }

  const attempt = Number(email.attempt_count) + 1;
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
    const { error: updateError } = await db().from('email_notifications').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider_message_id: result.id || null,
      attempt_count: attempt,
      error_summary: null,
    }).eq('id', email.id);
    if (updateError) throw updateError;
    return { sent: true, skipped: false };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await db().from('email_notifications').update({ status: 'failed', attempt_count: attempt, error_summary: message.slice(0, 500) }).eq('id', email.id);
    logger.error('email_delivery_failed', { orderId, attempt, error: message });
    throw cause;
  }
}
