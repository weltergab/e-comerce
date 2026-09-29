import { send } from '@vercel/queue';
import { getEnv } from '../config/env';
import { logger } from '../shared/logger';
import {
  BACKGROUND_TASK_TOPIC,
  MAX_TASK_DELAY_SECONDS,
  TASK_RETENTION_SECONDS,
  nextWakeAt,
  taskIdempotencyKey,
  type BackgroundTask,
  type DeferredTaskInput,
} from './tasks';

function managedQueueAvailable() {
  return getEnv().nodeEnv === 'production'
    || Boolean(process.env.VERCEL || process.env.VERCEL_QUEUE_BASE_URL || process.env.VERCEL_OIDC_TOKEN);
}

function delayUntil(date: string) {
  return Math.max(0, Math.min(MAX_TASK_DELAY_SECONDS, Math.ceil((Date.parse(date) - Date.now()) / 1000)));
}

function enqueueLocally(task: BackgroundTask, delaySeconds: number, attempt = 1) {
  const timer = setTimeout(async () => {
    try {
      const { processBackgroundTask } = await import('./task-handler.js');
      await processBackgroundTask(task);
    } catch (error) {
      logger.error('local_background_task_failed', {
        taskType: task.type,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt < 10) enqueueLocally(task, Math.min(300, 2 ** attempt * 5), attempt + 1);
    }
  }, delaySeconds * 1000);
  timer.unref();
}

export async function enqueueTask(task: BackgroundTask, delaySeconds = 0) {
  if (!managedQueueAvailable()) {
    enqueueLocally(task, delaySeconds);
    return;
  }
  await send(BACKGROUND_TASK_TOPIC, task, {
    delaySeconds,
    retentionSeconds: TASK_RETENTION_SECONDS,
    idempotencyKey: taskIdempotencyKey(task),
  });
}

export async function enqueueDeferredTask(task: DeferredTaskInput, notBefore: string) {
  const wakeAt = nextWakeAt(notBefore);
  const message = { ...task, notBefore, wakeAt } as BackgroundTask;
  await enqueueTask(message, delayUntil(wakeAt));
}

export async function continueDeferredTask(task: Extract<BackgroundTask, { notBefore: string }>) {
  const wakeAt = nextWakeAt(task.notBefore, task.wakeAt);
  const message = { ...task, wakeAt } as BackgroundTask;
  await enqueueTask(message, delayUntil(wakeAt));
}
