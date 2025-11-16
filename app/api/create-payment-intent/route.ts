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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid cart items' },
        { status: 400 }
      );
    }

    const amount = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const description = items.map((item: any) =>
      `${item.quantity}x Produto ID: ${item.productId}`
    ).join(', ');

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
        itemCount: items.length.toString(),
        products: JSON.stringify(items.map((item: any) => ({
          id: item.productId,
          qty: item.quantity,
          price: item.price,
        }))),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Payment Intent Error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
