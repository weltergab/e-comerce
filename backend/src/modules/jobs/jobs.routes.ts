import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { getEnv } from '../../config/env';
import { db } from '../../db/client';
import { AppError } from '../../shared/errors';
import { asyncHandler } from '../../shared/http';
import { processEmailOutbox } from '../payments/email.service';
import { processPaymentEvents, reconcilePendingOrders } from '../payments/payment-events.service';
import { cleanupOrphanProductImages } from '../catalog/product-images.service';
import { checkOperationalAlerts } from './operations.service';

function authorized(value: string | undefined) {
  const expected = `Bearer ${getEnv().cronSecret}`;
  if (!value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export const jobRoutes = Router();
jobRoutes.use((req, _res, next) => authorized(req.header('authorization')) ? next() : next(new AppError(401, 'INVALID_CRON_SECRET', 'Não autorizado.')));
jobRoutes.post('/payments', asyncHandler(async (_req, res) => {
  const reconciliation = await reconcilePendingOrders();
  const events = await processPaymentEvents();
  const emails = await processEmailOutbox();
  const images = await cleanupOrphanProductImages();
  const alerts = await checkOperationalAlerts();
  const { data: redactedOrders } = await db().rpc('redact_old_order_pii', { p_retention_days: getEnv().piiRetentionDays });
  res.json({ reconciliation, events, emails, images, alerts, redactedOrders });
}));
jobRoutes.get('/payments', asyncHandler(async (_req, res) => {
  const reconciliation = await reconcilePendingOrders();
  const events = await processPaymentEvents();
  const emails = await processEmailOutbox();
  const images = await cleanupOrphanProductImages();
  const alerts = await checkOperationalAlerts();
  const { data: redactedOrders } = await db().rpc('redact_old_order_pii', { p_retention_days: getEnv().piiRetentionDays });
  res.json({ reconciliation, events, emails, images, alerts, redactedOrders });
}));
