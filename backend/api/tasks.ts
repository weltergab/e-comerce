import { QueueClient } from '@vercel/queue';
import { backgroundTaskRetry, processBackgroundTask } from '../src/background/task-handler';

const queue = new QueueClient();

export default queue.handleNodeCallback(processBackgroundTask, {
  visibilityTimeoutSeconds: 60,
  retry: (error, metadata) => backgroundTaskRetry(error, metadata.deliveryCount),
});
