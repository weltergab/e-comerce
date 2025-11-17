// Admin Products API - List and Create
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/middleware';
import { stripe } from '@/lib/stripe/server';
import Stripe from 'stripe';

// GET - List all products
export async function GET(request: NextRequest) {
  try {
    const admin = authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    // List all products with their prices
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    // Buscar preços manualmente para garantir que temos os dados
    const formattedProducts = await Promise.all(
      products.data.map(async (product) => {
        let priceData = null;

        // Verificar se default_price está expandido
        const defaultPrice = product.default_price;

        if (defaultPrice) {
          if (typeof defaultPrice === 'string') {
            // Se for string, buscar o price manualmente
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
            // Se já está expandido
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
          description: product.description,
          images: product.images,
          active: product.active,
          metadata: product.metadata,
          price: priceData,
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

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const admin = authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    const {
      name,
      description,
      price,
      currency = 'brl',
      images,
      stock,
    } = await request.json();

    // Validations
    if (!name || !price) {
      return NextResponse.json(
        { error: 'Nome e preço são obrigatórios' },
        { status: 400 }
      );
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: 'Preço deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Create product in Stripe
    const product = await stripe.products.create({
      name,
      description: description || undefined,
      images: images || [],
      metadata: {
        stock: stock?.toString() || '0',
      },
    });

    // Create price for the product
    const priceObj = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency,
    });

    // Set the default price
    await stripe.products.update(product.id, {
      default_price: priceObj.id,
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        price: {
          id: priceObj.id,
          unit_amount: priceObj.unit_amount,
          currency: priceObj.currency,
        },
        metadata: product.metadata,
      },
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    );
  }
}
