// Admin Products API - Update and Delete specific product
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/middleware';
import { stripe } from '@/lib/stripe/server';
import Stripe from 'stripe';

// PUT - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { name, description, images, price, stock, active } =
      await request.json();

    // Build update object
    const updateData: Stripe.ProductUpdateParams = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (images !== undefined) updateData.images = images;
    if (active !== undefined) updateData.active = active;

    // Update metadata for stock
    if (stock !== undefined) {
      updateData.metadata = { stock: stock.toString() };
    }

    // Update product
    const product = await stripe.products.update(id, updateData);

    // If price is being updated, create a new price
    let newPrice = null;
    if (price !== undefined && price > 0) {
      // Get current default price
      const currentProduct = await stripe.products.retrieve(id);
      const currentPriceId =
        typeof currentProduct.default_price === 'string'
          ? currentProduct.default_price
          : currentProduct.default_price?.id;

      // Check if price actually changed
      let shouldUpdatePrice = false;
      let currency = 'brl';

      if (currentPriceId) {
        const currentPrice = await stripe.prices.retrieve(currentPriceId);
        currency = currentPrice.currency;
        const currentAmount = currentPrice.unit_amount || 0;
        const newAmount = Math.round(price * 100);

        // Only create new price if amount changed
        shouldUpdatePrice = currentAmount !== newAmount;
      } else {
        // No current price, create one
        shouldUpdatePrice = true;
      }

      if (shouldUpdatePrice) {
        // Create new price
        newPrice = await stripe.prices.create({
          product: id,
          unit_amount: Math.round(price * 100),
          currency,
        });

        // Set as default price
        await stripe.products.update(id, {
          default_price: newPrice.id,
        });

        // Archive old price
        if (currentPriceId) {
          await stripe.prices.update(currentPriceId, { active: false });
        }
      }
    }

    // Get updated product with price
    const updatedProduct = await stripe.products.retrieve(id, {
      expand: ['default_price'],
    });

    // Buscar preço manualmente se necessário
    let priceData = null;
    const defaultPrice = updatedProduct.default_price;

    if (defaultPrice) {
      if (typeof defaultPrice === 'string') {
        const price = await stripe.prices.retrieve(defaultPrice);
        priceData = {
          id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
        };
      } else {
        priceData = {
          id: defaultPrice.id,
          unit_amount: defaultPrice.unit_amount,
          currency: defaultPrice.currency,
        };
      }
    }

    return NextResponse.json({
      success: true,
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        images: updatedProduct.images,
        active: updatedProduct.active,
        metadata: updatedProduct.metadata,
        price: priceData,
      },
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar produto' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Archive product (Stripe doesn't allow deletion, only archiving)
    await stripe.products.update(id, { active: false });

    return NextResponse.json({
      success: true,
      message: 'Produto arquivado com sucesso',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir produto' },
      { status: 500 }
    );
  }
}

// GET - Get a specific product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const product = await stripe.products.retrieve(id, {
      expand: ['default_price'],
    });

    // Buscar preço manualmente se necessário
    let priceData = null;
    const defaultPrice = product.default_price;

    if (defaultPrice) {
      if (typeof defaultPrice === 'string') {
        const price = await stripe.prices.retrieve(defaultPrice);
        priceData = {
          id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
        };
      } else {
        priceData = {
          id: defaultPrice.id,
          unit_amount: defaultPrice.unit_amount,
          currency: defaultPrice.currency,
        };
      }
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        active: product.active,
        metadata: product.metadata,
        price: priceData,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    );
  }
}
