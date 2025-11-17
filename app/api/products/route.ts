// Public Products API - List all active products from Stripe
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    // List all active products with their prices
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    // Format products for frontend
    const formattedProducts = await Promise.all(
      products.data.map(async (product) => {
        let priceData = null;
        const defaultPrice = product.default_price;

        if (defaultPrice) {
          if (typeof defaultPrice === 'string') {
            try {
              const price = await stripe.prices.retrieve(defaultPrice);
              priceData = {
                id: price.id,
                unit_amount: price.unit_amount,
                currency: price.currency,
              };
            } catch (error) {
              console.error('Error fetching price:', error);
            }
          } else {
            priceData = {
              id: defaultPrice.id,
              unit_amount: defaultPrice.unit_amount,
              currency: defaultPrice.currency,
            };
          }
        } else {
          // Se não tem default_price, buscar todos os preços do produto
          try {
            const prices = await stripe.prices.list({
              product: product.id,
              active: true,
              limit: 1,
            });

            if (prices.data.length > 0) {
              const price = prices.data[0];
              priceData = {
                id: price.id,
                unit_amount: price.unit_amount,
                currency: price.currency,
              };
            }
          } catch (error) {
            console.error('Error fetching prices for product:', product.id, error);
          }
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: priceData?.unit_amount ? priceData.unit_amount / 100 : 0,
          image: product.images[0] || '',
          category: product.metadata?.category || 'Geral',
          stock: parseInt(product.metadata?.stock || '0'),
          stripePriceId: priceData?.id || '',
        };
      })
    );

    return NextResponse.json({
      success: true,
      products: formattedProducts,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produtos' },
      { status: 500 }
    );
  }
}
