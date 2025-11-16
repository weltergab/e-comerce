// Get current user info from token
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      id: user.userId,
      email: user.email,
      username: user.username,
    },
  });
}
