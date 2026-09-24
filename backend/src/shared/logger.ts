type LogLevel = 'info' | 'warn' | 'error';

const privateKeys = new Set(['password', 'token', 'clientSecret', 'authorization', 'stripe-signature']);

function sanitize(context: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, privateKeys.has(key) ? '[REDACTED]' : value])
  );
}

function write(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  const payload = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...sanitize(context) });
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};
