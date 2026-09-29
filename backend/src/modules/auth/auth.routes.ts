import { Router, type Response } from 'express';
import { getEnv } from '../../config/env';
import { authLimiter } from '../../config/security';
import { AppError } from '../../shared/errors';
import { asyncHandler } from '../../shared/http';
import { logger } from '../../shared/logger';
import { requireAuth } from './auth.middleware';
import { parseLogin, parseRegistration } from './auth.schemas';
import { currentUser, login, register, requestPasswordReset, resetPassword, revokeSession, rotateSession } from './auth.service';

const refreshCookie = 'storecy_refresh';

function cookieValue(header: string | undefined, name: string) {
  const entry = header?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

function setRefreshCookie(res: Response, token: string) {
  const secure = getEnv().nodeEnv === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${refreshCookie}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=2592000${secure}`);
}

function clearRefreshCookie(res: Response) {
  const secure = getEnv().nodeEnv === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${refreshCookie}=; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=0${secure}`);
}

export const authRoutes = Router();

authRoutes.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const input = parseLogin(req.body);
  const session = await login(input.emailOrUsername, input.password);
  setRefreshCookie(res, session.refreshToken);
  res.json({ accessToken: session.accessToken, user: session.user });
}));

authRoutes.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const input = parseRegistration(req.body);
  const session = await register(input.email, input.username, input.password);
  setRefreshCookie(res, session.refreshToken);
  res.status(201).json({ accessToken: session.accessToken, user: session.user });
}));

authRoutes.post('/refresh', authLimiter, asyncHandler(async (req, res) => {
  const token = cookieValue(req.headers.cookie, refreshCookie);
  if (!token) {
    res.status(204).end();
    return;
  }
  const session = await rotateSession(token);
  setRefreshCookie(res, session.refreshToken);
  res.json({ accessToken: session.accessToken, user: session.user });
}));

authRoutes.post('/logout', asyncHandler(async (req, res) => {
  await revokeSession(cookieValue(req.headers.cookie, refreshCookie));
  clearRefreshCookie(res);
  res.status(204).end();
}));

authRoutes.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await currentUser(req.auth!.userId);
  res.json({ user });
}));

authRoutes.post('/password-reset/request', authLimiter, asyncHandler(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, 'INVALID_EMAIL', 'Informe um email válido.');
  await requestPasswordReset(email).catch((error) => logger.error('password_reset_request_failed', { error: error instanceof Error ? error.message : String(error) }));
  res.status(202).json({ message: 'Se o email estiver cadastrado, enviaremos as instruções.' });
}));

authRoutes.post('/password-reset/confirm', authLimiter, asyncHandler(async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (token.length < 32 || password.length < 10 || password.length > 128) throw new AppError(400, 'INVALID_PASSWORD_RESET', 'Token ou nova senha inválidos.');
  await resetPassword(token, password);
  res.status(204).end();
}));

authRoutes.get([
  '/login',
  '/register',
  '/refresh',
  '/logout',
  '/password-reset/request',
  '/password-reset/confirm',
], (req, res) => {
  res.setHeader('Allow', 'POST, OPTIONS');
  res.status(405).json({
    code: 'METHOD_NOT_ALLOWED',
    message: `A rota ${req.path} aceita somente POST.`,
    requestId: req.requestId,
  });
});
