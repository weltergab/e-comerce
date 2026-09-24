import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env';
import type { AccessClaims } from './auth.types';

const issuer = 'storecy-api';
const audience = 'storecy-web';

export function signAccessToken(user: AccessClaims) {
  return jwt.sign(user, getEnv().jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer,
    audience,
    jwtid: randomUUID(),
  });
}

export function verifyAccessToken(token: string): AccessClaims | null {
  try {
    return jwt.verify(token, getEnv().jwtSecret, {
      algorithms: ['HS256'],
      issuer,
      audience,
    }) as AccessClaims;
  } catch {
    return null;
  }
}

export function newRefreshToken() {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string) {
  return createHash('sha256')
    .update(`${getEnv().jwtRefreshSecret}:${token}`)
    .digest('hex');
}
