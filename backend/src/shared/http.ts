import type { ErrorRequestHandler, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { AppError, asError } from './errors';
import { logger } from './logger';
import { Sentry } from '../config/monitoring';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export const requestContext: RequestHandler = (req, res, next) => {
  req.requestId = req.header('x-request-id')?.slice(0, 128) || randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
};

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Rota ${req.method} ${req.path} não encontrada`));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const uploadLimit = errorCode.startsWith('LIMIT_');
  const known = error instanceof AppError || uploadLimit;
  const normalized = asError(error);
  const status = error instanceof AppError ? error.status : uploadLimit ? 413 : 500;

  logger.error('request_failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    status,
    error: normalized.message,
  });
  if (!known || status >= 500) Sentry.captureException(normalized, { tags: { requestId: req.requestId }, extra: { method: req.method, path: req.path } });

  res.status(status).json({
    code: error instanceof AppError ? error.code : uploadLimit ? 'UPLOAD_LIMIT_EXCEEDED' : 'INTERNAL_ERROR',
    message: error instanceof AppError ? error.message : uploadLimit ? 'O arquivo excede o limite permitido.' : 'Não foi possível processar a solicitação.',
    requestId: req.requestId,
    ...(error instanceof AppError && error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
  });
};

export const asyncHandler = (handler: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
