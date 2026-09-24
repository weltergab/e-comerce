import { Router } from 'express';
import { asyncHandler } from '../../shared/http';
import { parsePagination } from './catalog.schemas';
import { getProduct, listProducts } from './catalog.service';

export const catalogRoutes = Router();

catalogRoutes.get('/', asyncHandler(async (req, res) => {
  const result = await listProducts(parsePagination(req.query));
  res.json({ success: true, ...result });
}));

catalogRoutes.get('/:id', asyncHandler(async (req, res) => {
  res.json({ success: true, product: await getProduct(String(req.params.id)) });
}));
