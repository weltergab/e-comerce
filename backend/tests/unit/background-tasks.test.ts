import { describe, expect, it } from 'vitest';
import { DAY_SECONDS, MAX_TASK_DELAY_SECONDS, nextWakeAt, parseBackgroundTask, taskIdempotencyKey } from '../../src/background/tasks';

describe('background tasks', () => {
  it('valida mensagens antes de executar efeitos externos', () => {
    const task = parseBackgroundTask({ type: 'payment-event', eventId: 'evt_123' });
    expect(task).toEqual({ type: 'payment-event', eventId: 'evt_123' });
    expect(() => parseBackgroundTask({ type: 'payment-event' })).toThrow(/eventId/);
    expect(() => parseBackgroundTask({ type: 'unknown' })).toThrow(/desconhecido/);
  });

  it('gera chaves de idempotência estáveis e distintas', () => {
    const first = { type: 'email-delivery', orderId: 'order_1' } as const;
    expect(taskIdempotencyKey(first)).toBe(taskIdempotencyKey(first));
    expect(taskIdempotencyKey(first)).not.toBe(taskIdempotencyKey({ ...first, orderId: 'order_2' }));
  });

  it('entrega prazos curtos no horário e divide retenções longas em checkpoints', () => {
    const now = Date.now();
    const shortDue = new Date(now + 15 * 60_000).toISOString();
    expect(nextWakeAt(shortDue, new Date(now).toISOString())).toBe(shortDue);

    const longDue = new Date(now + 30 * DAY_SECONDS * 1000).toISOString();
    const wakeAt = Date.parse(nextWakeAt(longDue, new Date(now).toISOString()));
    expect(wakeAt).toBe(now + MAX_TASK_DELAY_SECONDS * 1000);
  });
});
