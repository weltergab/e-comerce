import type { RequestHandler } from 'express';
import { getEnv } from './env';

export const corsMiddleware: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin?.replace(/\/$/, '');
  const { corsOrigins } = getEnv();

  if (origin && corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, Stripe-Signature');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
};
