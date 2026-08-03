import type { IncomingMessage, ServerResponse } from 'node:http';

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/$/, '');

function getAllowedOrigins() {
  const frontendUrl = process.env.VERCEL
    ? process.env.FRONTEND_URL
    : process.env.FRONTEND_LOCAL_URL;
  const frontUrl = normalizeOrigin(frontendUrl || 'http://localhost:5173');
  return new Set(
    [frontUrl, ...(process.env.CORS_ORIGINS || '').split(',')]
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  );
}

export function applyCors(req: IncomingMessage, res: ServerResponse) {
  const requestOrigin = req.headers.origin ? normalizeOrigin(req.headers.origin) : null;
  const allowedOrigins = getAllowedOrigins();
  const fallbackOrigin = [...allowedOrigins][0];

  if (!requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', fallbackOrigin);
  } else if (allowedOrigins.has(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature, Cache-Control');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

export function getEnvStatus() {
  const requiredEnv = [
    process.env.VERCEL ? 'FRONTEND_URL' : 'FRONTEND_LOCAL_URL',
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  return {
    ok: requiredEnv.every((key) => Boolean(process.env[key])),
    env: Object.fromEntries(requiredEnv.map((key) => [key, Boolean(process.env[key])])),
    cors: {
      frontUrl: normalizeOrigin(
        (process.env.VERCEL ? process.env.FRONTEND_URL : process.env.FRONTEND_LOCAL_URL) ||
          'http://localhost:5173'
      ),
      origins: [...getAllowedOrigins()],
    },
  };
}

export async function handleApi(req: IncomingMessage, res: ServerResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const { default: app } = await import('../server/index');
    return app(req, res);
  } catch (error: any) {
    console.error('Failed to load API app:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'API failed to start',
      message: error?.message || 'Unknown error',
      ...getEnvStatus(),
    }));
  }
}
