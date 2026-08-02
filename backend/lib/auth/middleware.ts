// Auth helpers for API routes
import { verifyToken, JWTPayload } from './jwt';

type AuthRequest = {
  headers: Headers | Record<string, string | string[] | undefined>;
};

export function getAuthToken(request: AuthRequest): string | null {
  const authHeader =
    request.headers instanceof Headers
      ? request.headers.get('authorization')
      : request.headers.authorization;

  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null;
  }
  return headerValue?.substring(7) || null;
}

export function authenticateRequest(request: AuthRequest): JWTPayload | null {
  const token = getAuthToken(request);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

export function authenticateAdmin(request: AuthRequest): JWTPayload | null {
  const user = authenticateRequest(request);
  if (!user || !user.isAdmin) {
    return null;
  }
  return user;
}
