import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';

export async function GET() {
  try {
    // Buscar estoque diretamente do Stripe
    const products = await stripe.products.list({
      active: true,
    });

    const stock: Record<string, number> = {};

    products.data.forEach((product) => {
      stock[product.id] = parseInt(product.metadata?.stock || '0');
    });

    console.log('📊 API /stock called - Current stock from Stripe:', stock);
    return NextResponse.json({ stock });
  } catch (error) {
    console.error('❌ Error fetching stock:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock' },
      { status: 500 }
    );
  }
}
