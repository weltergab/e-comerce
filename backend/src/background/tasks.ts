import { createHash } from 'node:crypto';
import { AppError } from '../shared/errors';

export const BACKGROUND_TASK_TOPIC = 'storecy-tasks';
export const DAY_SECONDS = 24 * 60 * 60;
export const MAX_TASK_DELAY_SECONDS = 6 * DAY_SECONDS;
export const TASK_RETENTION_SECONDS = 7 * DAY_SECONDS;

interface DeferredTask {
  notBefore: string;
  wakeAt: string;
}

export type BackgroundTask =
  | { type: 'payment-event'; eventId: string }
  | { type: 'email-delivery'; orderId: string }
  | ({ type: 'reservation-expiry'; orderId: string } & DeferredTask)
  | ({ type: 'product-image-cleanup'; storagePath: string } & DeferredTask)
  | ({ type: 'order-fulfillment-check'; orderId: string } & DeferredTask)
  | ({ type: 'order-pii-redaction'; orderId: string } & DeferredTask)
  | ({ type: 'refresh-token-cleanup'; tokenId: string } & DeferredTask)
  | ({ type: 'password-reset-token-cleanup'; tokenId: string } & DeferredTask);

export type DeferredTaskInput =
  | { type: 'reservation-expiry'; orderId: string }
  | { type: 'product-image-cleanup'; storagePath: string }
  | { type: 'order-fulfillment-check'; orderId: string }
  | { type: 'order-pii-redaction'; orderId: string }
  | { type: 'refresh-token-cleanup'; tokenId: string }
  | { type: 'password-reset-token-cleanup'; tokenId: string };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(400, 'INVALID_BACKGROUND_TASK', 'Tarefa assíncrona inválida.');
  }
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, name: string) {
  const field = value[name];
  if (typeof field !== 'string' || !field.trim()) {
    throw new AppError(400, 'INVALID_BACKGROUND_TASK', `Campo ${name} inválido.`);
  }
  return field;
}

function deferredFields(value: Record<string, unknown>) {
  const notBefore = stringField(value, 'notBefore');
  const wakeAt = stringField(value, 'wakeAt');
  if (!Number.isFinite(Date.parse(notBefore)) || !Number.isFinite(Date.parse(wakeAt))) {
    throw new AppError(400, 'INVALID_BACKGROUND_TASK', 'Datas da tarefa assíncrona são inválidas.');
  }
  return { notBefore, wakeAt };
}

export function parseBackgroundTask(input: unknown): BackgroundTask {
  const value = record(input);
  const type = stringField(value, 'type');
  if (type === 'payment-event') return { type, eventId: stringField(value, 'eventId') };
  if (type === 'email-delivery') return { type, orderId: stringField(value, 'orderId') };
  if (type === 'reservation-expiry') return { type, orderId: stringField(value, 'orderId'), ...deferredFields(value) };
  if (type === 'product-image-cleanup') return { type, storagePath: stringField(value, 'storagePath'), ...deferredFields(value) };
  if (type === 'order-fulfillment-check') return { type, orderId: stringField(value, 'orderId'), ...deferredFields(value) };
  if (type === 'order-pii-redaction') return { type, orderId: stringField(value, 'orderId'), ...deferredFields(value) };
  if (type === 'refresh-token-cleanup') return { type, tokenId: stringField(value, 'tokenId'), ...deferredFields(value) };
  if (type === 'password-reset-token-cleanup') return { type, tokenId: stringField(value, 'tokenId'), ...deferredFields(value) };
  throw new AppError(400, 'INVALID_BACKGROUND_TASK', 'Tipo de tarefa assíncrona desconhecido.');
}

export function taskIdempotencyKey(task: BackgroundTask) {
  const digest = createHash('sha256').update(JSON.stringify(task)).digest('hex');
  return `${task.type}:${digest}`;
}

export function nextWakeAt(notBefore: string, previousWakeAt = new Date().toISOString()) {
  const dueAt = Date.parse(notBefore);
  let base = Date.parse(previousWakeAt);
  const now = Date.now();
  if (!Number.isFinite(dueAt) || !Number.isFinite(base)) throw new Error('Invalid deferred task date');
  while (base <= now && base < dueAt) base += MAX_TASK_DELAY_SECONDS * 1000;
  return new Date(Math.min(dueAt, base)).toISOString();
}
