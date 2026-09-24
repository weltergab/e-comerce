import { AppError } from '../../shared/errors';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-zA-Z0-9]+$/;

function record(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'INVALID_BODY', 'Corpo da requisição inválido.');
  }
  return body as Record<string, unknown>;
}

export function parseLogin(body: unknown) {
  const value = record(body);
  const emailOrUsername = typeof value.emailOrUsername === 'string' ? value.emailOrUsername.trim().toLowerCase() : '';
  const password = typeof value.password === 'string' ? value.password : '';
  if (!emailOrUsername || !password) {
    throw new AppError(400, 'INVALID_CREDENTIALS_INPUT', 'Email/usuário e senha são obrigatórios.');
  }
  return { emailOrUsername, password };
}

export function parseRegistration(body: unknown) {
  const value = record(body);
  const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : '';
  const username = typeof value.username === 'string' ? value.username.trim().toLowerCase() : '';
  const password = typeof value.password === 'string' ? value.password : '';
  const fieldErrors: Record<string, string> = {};

  if (!emailPattern.test(email)) fieldErrors.email = 'Informe um email válido.';
  if (username.length < 3 || username.length > 50 || !usernamePattern.test(username)) {
    fieldErrors.username = 'Use de 3 a 50 letras ou números.';
  }
  if (password.length < 10 || password.length > 128) {
    fieldErrors.password = 'A senha deve ter de 10 a 128 caracteres.';
  }
  if (Object.keys(fieldErrors).length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Revise os campos informados.', fieldErrors);
  }
  return { email, username, password };
}
