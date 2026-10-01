import { getEnv } from '../../config/env';
import { sessionSecondsRemaining } from './auth.session';

export const REFRESH_COOKIE_NAME = 'storecy_refresh';

export function cookieValue(header: string | undefined, name: string) {
  const entry = header?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

export function buildRefreshCookie(token: string, expiresAt: string, production: boolean, now = Date.now()) {
  const attributes = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    `SameSite=${production ? 'None' : 'Lax'}`,
    'Path=/api/auth',
    `Max-Age=${sessionSecondsRemaining(expiresAt, now)}`,
  ];
  if (production) attributes.push('Secure', 'Partitioned');
  return attributes.join('; ');
}

export function buildClearedRefreshCookie(production: boolean) {
  const attributes = [
    `${REFRESH_COOKIE_NAME}=`,
    'HttpOnly',
    `SameSite=${production ? 'None' : 'Lax'}`,
    'Path=/api/auth',
    'Max-Age=0',
  ];
  if (production) attributes.push('Secure', 'Partitioned');
  return attributes.join('; ');
}

export function refreshCookie(token: string, expiresAt: string) {
  return buildRefreshCookie(token, expiresAt, getEnv().nodeEnv === 'production');
}

export function clearedRefreshCookie() {
  return buildClearedRefreshCookie(getEnv().nodeEnv === 'production');
}
