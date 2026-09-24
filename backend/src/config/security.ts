import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 180,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/webhooks/') || req.path.startsWith('/api/jobs/'),
  handler: (req, res) => res.status(429).json({ code: 'RATE_LIMITED', message: 'Muitas solicitações. Aguarde e tente novamente.', requestId: req.requestId }),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde antes de tentar novamente.', requestId: req.requestId }),
});

export const checkoutLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ code: 'RATE_LIMITED', message: 'Muitas tentativas de checkout.', requestId: req.requestId }),
});
