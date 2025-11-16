// Auth middleware for API routes
import { NextRequest } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';

export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function authenticateRequest(request: NextRequest): JWTPayload | null {
  const token = getAuthToken(request);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}
