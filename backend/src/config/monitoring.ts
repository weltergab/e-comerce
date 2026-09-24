import * as Sentry from '@sentry/node';
import { getEnv } from './env';

let initialized = false;

export function initMonitoring() {
  if (initialized) return;
  const env = getEnv();
  Sentry.init({ dsn: env.sentryDsn, enabled: Boolean(env.sentryDsn), environment: env.nodeEnv });
  initialized = true;
}

export { Sentry };
