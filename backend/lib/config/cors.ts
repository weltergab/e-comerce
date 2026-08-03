const DEFAULT_LOCAL_FRONTEND_URL = 'http://localhost:5173';
const DEFAULT_PRODUCTION_FRONTEND_URL = 'https://storecy.vercel.app';

export const normalizeOrigin = (origin: string) => origin.trim().replace(/\/$/, '');

const splitOrigins = (value?: string) =>
  (value || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

export function getFrontendBaseUrl() {
  const isHosted = Boolean(
    process.env.NODE_ENV === 'production' ||
      process.env.VERCEL ||
      process.env.VERCEL_URL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME
  );

  if (isHosted) {
    return normalizeOrigin(process.env.FRONTEND_URL || process.env.FRONT_URL || DEFAULT_PRODUCTION_FRONTEND_URL);
  }

  return normalizeOrigin(process.env.FRONTEND_LOCAL_URL || DEFAULT_LOCAL_FRONTEND_URL);
}

export function getAllowedOrigins() {
  return new Set(
    [
      DEFAULT_LOCAL_FRONTEND_URL,
      DEFAULT_PRODUCTION_FRONTEND_URL,
      process.env.FRONTEND_LOCAL_URL,
      process.env.FRONTEND_URL,
      process.env.FRONT_URL,
      ...splitOrigins(process.env.CORS_ORIGINS),
    ]
      .filter(Boolean)
      .map((origin) => normalizeOrigin(origin as string))
  );
}

export function applyCorsHeaders(
  originHeader: string | string[] | undefined,
  setHeader: (name: string, value: string) => void
) {
  const requestOrigin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const normalizedOrigin = requestOrigin ? normalizeOrigin(requestOrigin) : null;
  const allowedOrigins = getAllowedOrigins();
  const fallbackOrigin = getFrontendBaseUrl();

  if (!normalizedOrigin) {
    setHeader('Access-Control-Allow-Origin', fallbackOrigin);
  } else if (allowedOrigins.has(normalizedOrigin)) {
    setHeader('Access-Control-Allow-Origin', normalizedOrigin);
  }

  setHeader('Vary', 'Origin');
  setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature, Cache-Control');
  setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

export function getEnvStatus() {
  const frontendConfigured = Boolean(process.env.FRONTEND_URL || process.env.FRONT_URL || process.env.FRONTEND_LOCAL_URL);
  const requiredEnv = {
    FRONTEND_URL: Boolean(process.env.FRONTEND_URL),
    FRONTEND_LOCAL_URL: Boolean(process.env.FRONTEND_LOCAL_URL),
    FRONT_URL: Boolean(process.env.FRONT_URL),
    JWT_SECRET: Boolean(process.env.JWT_SECRET),
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_ANON_KEY: Boolean(process.env.SUPABASE_ANON_KEY),
    STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  };

  return {
    ok:
      frontendConfigured &&
      requiredEnv.JWT_SECRET &&
      requiredEnv.SUPABASE_URL &&
      requiredEnv.SUPABASE_ANON_KEY &&
      requiredEnv.STRIPE_SECRET_KEY &&
      requiredEnv.STRIPE_WEBHOOK_SECRET,
    env: requiredEnv,
    cors: {
      frontUrl: getFrontendBaseUrl(),
      origins: [...getAllowedOrigins()],
    },
  };
}
