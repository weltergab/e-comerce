import { Router } from 'express';
import { checkoutLimiter } from '../../config/security';
import { asyncHandler } from '../../shared/http';
import { requireAuth } from '../auth/auth.middleware';
import { parseCheckout, parseIdempotencyKey } from './checkout.schemas';
import { createCheckout } from './checkout.service';

export const checkoutRoutes = Router();

checkoutRoutes.post('/', checkoutLimiter, requireAuth, asyncHandler(async (req, res) => {
  const input = parseCheckout(req.body);
  const idempotencyKey = parseIdempotencyKey(req.header('idempotency-key'));
  const result = await createCheckout({ user: req.auth!, ...input, idempotencyKey });
  res.status(201).json(result);
}));

// Compatibilidade temporária de URL; o contrato seguro é idêntico a POST /api/checkout.
checkoutRoutes.post('/payment-intent', checkoutLimiter, requireAuth, asyncHandler(async (req, res) => {
  const input = parseCheckout(req.body);
  const idempotencyKey = parseIdempotencyKey(req.header('idempotency-key'));
  const result = await createCheckout({ user: req.auth!, ...input, idempotencyKey });
  res.status(201).json(result);
}));
