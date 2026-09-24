import type { RequestHandler } from 'express';
import { db } from '../../db/client';
import { AppError } from '../../shared/errors';
import { verifyAccessToken } from './auth.tokens';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const claims = token ? verifyAccessToken(token) : null;
  if (!claims) return next(new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.'));
  req.auth = claims;
  next();
};

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  if (!req.auth) return next(new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.'));
  const { data, error } = await db().from('users').select('is_admin').eq('id', req.auth.userId).maybeSingle();
  if (error) return next(error);
  if (!data?.is_admin) return next(new AppError(403, 'FORBIDDEN', 'Acesso restrito a administradores.'));
  next();
};
