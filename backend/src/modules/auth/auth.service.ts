import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../../db/client';
import { AppError } from '../../shared/errors';
import { hashRefreshToken, newRefreshToken, signAccessToken } from './auth.tokens';
import type { AuthUser } from './auth.types';

interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  is_admin: boolean | null;
}

function publicUser(row: UserRow): AuthUser {
  return { id: row.id, email: row.email, username: row.username, isAdmin: Boolean(row.is_admin) };
}

async function issueSession(user: AuthUser, familyId = randomUUID()) {
  const refreshToken = newRefreshToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
  const { error } = await db().from('refresh_tokens').insert({
    user_id: user.id,
    token_hash: hashRefreshToken(refreshToken),
    family_id: familyId,
    expires_at: expiresAt,
  });
  if (error) throw new AppError(500, 'SESSION_CREATE_FAILED', 'Não foi possível iniciar a sessão.');

  return {
    accessToken: signAccessToken({ userId: user.id, email: user.email, username: user.username, isAdmin: user.isAdmin }),
    refreshToken,
    user,
  };
}

export async function login(emailOrUsername: string, password: string) {
  const field = emailOrUsername.includes('@') ? 'email' : 'username';
  const { data, error } = await db().from('users').select('id,email,username,password_hash,is_admin').eq(field, emailOrUsername).maybeSingle();
  const row = data as UserRow | null;
  if (error || !row || !(await bcrypt.compare(password, row.password_hash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
  }
  return issueSession(publicUser(row));
}

export async function register(email: string, username: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  const { data, error } = await db().from('users').insert({ email, username, password_hash: passwordHash }).select('id,email,username,password_hash,is_admin').single();
  if (error?.code === '23505') throw new AppError(409, 'IDENTITY_ALREADY_EXISTS', 'Email ou usuário já cadastrado.');
  if (error || !data) throw new AppError(500, 'USER_CREATE_FAILED', 'Não foi possível criar o usuário.');
  return issueSession(publicUser(data as UserRow));
}

export async function rotateSession(rawToken: string) {
  const tokenHash = hashRefreshToken(rawToken);
  const { data } = await db().from('refresh_tokens').select('id,user_id,family_id,expires_at,revoked_at').eq('token_hash', tokenHash).maybeSingle();
  if (!data || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) {
    if (data?.family_id) {
      await db().from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('family_id', data.family_id).is('revoked_at', null);
    }
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Sessão expirada. Entre novamente.');
  }

  const revokedAt = new Date().toISOString();
  const { data: revoked, error: revokeError } = await db().from('refresh_tokens').update({ revoked_at: revokedAt }).eq('id', data.id).is('revoked_at', null).select('id').maybeSingle();
  if (revokeError || !revoked) {
    await db().from('refresh_tokens').update({ revoked_at: revokedAt }).eq('family_id', data.family_id).is('revoked_at', null);
    throw new AppError(401, 'REFRESH_REPLAY', 'Sessão inválida. Entre novamente.');
  }

  const { data: userData } = await db().from('users').select('id,email,username,password_hash,is_admin').eq('id', data.user_id).single();
  if (!userData) throw new AppError(401, 'USER_NOT_FOUND', 'Sessão inválida.');
  return issueSession(publicUser(userData as UserRow), data.family_id);
}

export async function revokeSession(rawToken?: string) {
  if (!rawToken) return;
  const { data } = await db().from('refresh_tokens').select('family_id').eq('token_hash', hashRefreshToken(rawToken)).maybeSingle();
  if (data?.family_id) await db().from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('family_id', data.family_id).is('revoked_at', null);
}

export async function currentUser(userId: string) {
  const { data } = await db().from('users').select('id,email,username,password_hash,is_admin').eq('id', userId).maybeSingle();
  if (!data) throw new AppError(401, 'USER_NOT_FOUND', 'Usuário da sessão não existe.');
  return publicUser(data as UserRow);
}

export async function requestPasswordReset(email: string) {
  const { data: user } = await db().from('users').select('id,email,username').eq('email', email.toLowerCase()).maybeSingle();
  if (!user) return;
  const token = randomBytes(32).toString('base64url');
  const { data: reset, error } = await db().from('password_reset_tokens').insert({
    user_id: user.id,
    token_hash: hashRefreshToken(token),
    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  }).select('id').single();
  if (error || !reset) throw new AppError(500, 'PASSWORD_RESET_FAILED', 'Não foi possível iniciar a recuperação.');

  const { getEnv } = await import('../../config/env');
  const env = getEnv();
  if (!env.resendApiKey || !env.emailFrom) return;
  const url = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `password-reset:${reset.id}` },
    body: JSON.stringify({ from: env.emailFrom, to: [user.email], subject: 'Redefinição de senha', html: `<p>Olá, ${user.username}.</p><p><a href="${url}">Redefinir senha</a></p><p>O link expira em 30 minutos.</p>` }),
  });
  if (!response.ok) throw new AppError(502, 'EMAIL_DELIVERY_FAILED', 'Não foi possível enviar o email de recuperação.');
}

export async function resetPassword(token: string, password: string) {
  const { data: reset } = await db().from('password_reset_tokens').select('id,user_id,expires_at,used_at').eq('token_hash', hashRefreshToken(token)).maybeSingle();
  if (!reset || reset.used_at || new Date(reset.expires_at).getTime() <= Date.now()) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'Link de redefinição inválido ou expirado.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const { data: used } = await db().from('password_reset_tokens').update({ used_at: now }).eq('id', reset.id).is('used_at', null).select('id').maybeSingle();
  if (!used) throw new AppError(400, 'INVALID_RESET_TOKEN', 'Link já utilizado.');
  await db().from('users').update({ password_hash: passwordHash }).eq('id', reset.user_id);
  await db().from('refresh_tokens').update({ revoked_at: now }).eq('user_id', reset.user_id).is('revoked_at', null);
}
