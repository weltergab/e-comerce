import { Router } from 'express';
import { asyncHandler } from '../../shared/http';
import { requireAuth } from '../auth/auth.middleware';
import { listUserOrders, orderStatus } from './orders.service';

export const orderRoutes = Router();
orderRoutes.use(requireAuth);
orderRoutes.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const result = await listUserOrders(req.auth!.userId, limit, typeof req.query.cursor === 'string' ? req.query.cursor : undefined);
  res.json({ orders: result.orders, total: result.orders.length, nextCursor: result.nextCursor });
}));
orderRoutes.get('/:id/status', asyncHandler(async (req, res) => res.json({ order: await orderStatus(String(req.params.id), req.auth!.userId) })));
