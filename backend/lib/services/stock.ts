import '../config/env';
import { stripe } from '../stripe/client';

export async function updateStock(productId: string, quantity: number): Promise<boolean> {
  console.log(`\n=== UPDATE STOCK CALLED ===`);
  console.log(`Product ID: ${productId}`);
  console.log(`Quantity to subtract: ${quantity}`);

  try {
    // Buscar o produto atual do Stripe
    const product = await stripe.products.retrieve(productId);
    const currentStock = parseInt(product.metadata?.stock || '0');
    const newStock = currentStock - quantity;

    console.log(`Current stock for product ${productId}: ${currentStock}`);
    console.log(`New stock will be: ${newStock}`);

    if (newStock < 0) {
      console.error(`❌ Insufficient stock for product ${productId}`);
      return false;
    }

    // Atualizar o estoque no Stripe
    await stripe.products.update(productId, {
      metadata: {
        stock: newStock.toString(),
      },
    });

    console.log(`✅ Stock updated in Stripe: Product ${productId} - Old: ${currentStock}, New: ${newStock}`);
    console.log(`=== UPDATE STOCK COMPLETE ===\n`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to update stock for product ${productId}:`, error);
    console.log(`=== UPDATE STOCK FAILED ===\n`);
    return false;
  }
}

export async function getStock(productId: string): Promise<number> {
  try {
    const product = await stripe.products.retrieve(productId);
    return parseInt(product.metadata?.stock || '0');
  } catch (error) {
    console.error(`Error getting stock for product ${productId}:`, error);
    return 0;
  }
}

export async function getAllStock(): Promise<Record<string, number>> {
  try {
    const products = await stripe.products.list({ active: true });
    const stock: Record<string, number> = {};

    products.data.forEach((product) => {
      stock[product.id] = parseInt(product.metadata?.stock || '0');
    });

    return stock;
  } catch (error) {
    console.error('Error getting all stock:', error);
    return {};
  }
}

export async function checkAvailability(productId: string, quantity: number): Promise<boolean> {
  const available = await getStock(productId);
  return available >= quantity;
}
