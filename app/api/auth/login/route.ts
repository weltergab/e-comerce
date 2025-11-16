// Login API route
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase/client';
import { signToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const { emailOrUsername, password } = await request.json();

    // Validações
    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: 'Email/Username e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se é email ou username
    const isEmail = emailOrUsername.includes('@');
    const field = isEmail ? 'email' : 'username';

    // Buscar usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq(field, emailOrUsername.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar login' },
      { status: 500 }
    );
  }
}
