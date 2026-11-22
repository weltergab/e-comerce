import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: '.env.local', quiet: true });
  dotenv.config({ path: '.env', quiet: true });
}

export interface AppEnv {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  corsOrigins: string[];
  jwtSecret: string;
  jwtRefreshSecret: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  imageHostAllowlist: string[];
  resendApiKey?: string;
  emailFrom?: string;
  sentryDsn?: string;
  piiRetentionDays: number;
}

let cached: AppEnv | null = null;
export const PRODUCTION_FRONTEND_URL = 'https://storecy.vercel.app';

function required(name: string, minimumLength = 1) {
  const value = process.env[name]?.trim();
  if (!value || value.length < minimumLength) {
    throw new Error(`${name} deve estar configurada${minimumLength > 1 ? ` com ao menos ${minimumLength} caracteres` : ''}`);
  }
  return value;
}

export function resolveFrontendUrl(value: string | undefined, nodeEnv: string) {
  const fallback = nodeEnv === 'production' ? PRODUCTION_FRONTEND_URL : 'http://localhost:5173';
  return (value || fallback).trim().replace(/\/$/, '');
}

export function resolveCorsOrigins(value: string | undefined, frontendUrl: string, nodeEnv: string) {
  const environmentOrigins = nodeEnv === 'production'
    ? [PRODUCTION_FRONTEND_URL]
    : ['http://localhost:5173'];
  return [...new Set([frontendUrl, ...environmentOrigins, ...(value || '').split(',')])]
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function getEnv(): AppEnv {
  if (cached) return cached;

  const nodeEnv = process.env.NODE_ENV || 'development';
  const frontendUrl = resolveFrontendUrl(process.env.FRONTEND_URL, nodeEnv);
  cached = {
    nodeEnv,
    port: Number(process.env.PORT || 3001),
    frontendUrl,
    corsOrigins: resolveCorsOrigins(process.env.CORS_ORIGINS, frontendUrl, nodeEnv),
    jwtSecret: required('JWT_SECRET', 32),
    jwtRefreshSecret: required('JWT_REFRESH_SECRET', 32),
    supabaseUrl: required('SUPABASE_URL'),
    supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
    stripeSecretKey: required('STRIPE_SECRET_KEY'),
    stripeWebhookSecret: required('STRIPE_WEBHOOK_SECRET'),
    imageHostAllowlist: (process.env.IMAGE_HOST_ALLOWLIST || '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
    resendApiKey: process.env.RESEND_API_KEY?.trim(),
    emailFrom: process.env.EMAIL_FROM?.trim(),
    sentryDsn: process.env.SENTRY_DSN?.trim(),
    piiRetentionDays: Number(process.env.PII_RETENTION_DAYS || 730),
  };

  if (!Number.isInteger(cached.port) || cached.port < 1 || cached.port > 65535) {
    throw new Error('PORT deve ser uma porta válida');
  }
  if (!Number.isInteger(cached.piiRetentionDays) || cached.piiRetentionDays < 30) {
    throw new Error('PII_RETENTION_DAYS deve ser um inteiro de ao menos 30 dias');
  }
  if (cached.nodeEnv === 'production' && (!cached.resendApiKey || !cached.emailFrom || !cached.sentryDsn)) {
    throw new Error('RESEND_API_KEY, EMAIL_FROM e SENTRY_DSN são obrigatórias em produção');
  }
  return cached;
}

export function resetEnvForTests() {
  cached = null;
}
