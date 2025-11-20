import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest } from '@/lib/auth/middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const user = authenticateRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { items } = await req.json();

    console.log('📦 Create Payment Intent - Items received:', JSON.stringify(items, null, 2));

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid cart items' },
        { status: 400 }
      );
    }

    // Validar que todos os items têm preço
    const invalidItems = items.filter((item: any) => !item.price || item.price <= 0);
    if (invalidItems.length > 0) {
      console.error('❌ Items with invalid price:', invalidItems);
      return NextResponse.json(
        { error: 'Alguns produtos não têm preço válido' },
        { status: 400 }
      );
    }

    const amount = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    console.log('💰 Total amount calculated:', amount, 'BRL');

    if (amount <= 0) {
      console.error('❌ Invalid total amount:', amount);
      return NextResponse.json(
        { error: 'Valor total inválido' },
        { status: 400 }
      );
    }

    const description = items.map((item: any) =>
      `${item.quantity}x Produto ID: ${item.productId}`
    ).join(', ');

    console.log('🔄 Creating PaymentIntent...');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'brl',
      description: description.substring(0, 1000),
      payment_method_types: ['card', 'boleto'],
      payment_method_options: {
        boleto: {
          expires_after_days: 3,
        },
      },
      metadata: {
        userId: user.userId,
        userEmail: user.email,
        userName: user.username,
        itemCount: items.length.toString(),
        products: JSON.stringify(items.map((item: any) => ({
          id: item.productId,
          qty: item.quantity,
          price: item.price,
        }))),
      },
    });

    console.log('✅ PaymentIntent created:', paymentIntent.id);
    console.log('🔑 Client secret:', paymentIntent.client_secret ? 'Generated' : 'MISSING');

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error('❌ Payment Intent Error:', error);
    console.error('Error details:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
