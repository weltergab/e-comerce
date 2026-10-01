import { Router } from 'express';
import { asyncHandler } from '../../shared/http';
import { requireAuth } from '../auth/auth.middleware';
import { parseAddressId, parseSavedAddress } from './addresses.schemas';
import { deleteAddress, listAddresses, saveAddress } from './addresses.service';

export const addressRoutes = Router();
addressRoutes.use(requireAuth);
addressRoutes.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

addressRoutes.get('/', asyncHandler(async (req, res) => {
  res.json({ addresses: await listAddresses(req.auth!.userId) });
}));

addressRoutes.post('/', asyncHandler(async (req, res) => {
  const address = await saveAddress(req.auth!.userId, null, parseSavedAddress(req.body));
  res.status(201).json({ address });
}));

addressRoutes.put('/:id', asyncHandler(async (req, res) => {
  const address = await saveAddress(req.auth!.userId, parseAddressId(req.params.id), parseSavedAddress(req.body));
  res.json({ address });
}));

addressRoutes.delete('/:id', asyncHandler(async (req, res) => {
  await deleteAddress(req.auth!.userId, parseAddressId(req.params.id));
  res.status(204).end();
}));
