import Stripe from 'stripe';
import { products } from '@/lib/data/products';
import fs from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const STOCK_FILE = path.join(process.cwd(), 'data', 'stock.json');
let stockLevels: Record<string, number> = {};
let isInitialized = false;

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
  }
}

function loadStock(): Record<string, number> {
  ensureDataDir();

  try {
    if (fs.existsSync(STOCK_FILE)) {
      const data = fs.readFileSync(STOCK_FILE, 'utf-8');
      const loaded = JSON.parse(data);
      console.log('📂 Stock loaded from file:', loaded);
      return loaded;
    }
  } catch (error) {
    console.error('❌ Error loading stock file:', error);
  }

  const initialStock: Record<string, number> = {};
  products.forEach((product) => {
    initialStock[product.id] = product.stock;
  });

  console.log('🆕 Initialized stock from products:', initialStock);
  saveStock(initialStock);
  return initialStock;
}

function saveStock(stock: Record<string, number>) {
  ensureDataDir();

  try {
    fs.writeFileSync(STOCK_FILE, JSON.stringify(stock, null, 2), 'utf-8');
    console.log('💾 Stock saved to file:', stock);
  } catch (error) {
    console.error('❌ Error saving stock file:', error);
  }
}

function initializeStock() {
  if (!isInitialized) {
    stockLevels = loadStock();
    isInitialized = true;
    console.log('✅ Stock initialized:', stockLevels);
  }
}

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
  initializeStock();
  return stockLevels[productId] || 0;
}

export async function getAllStock(): Promise<Record<string, number>> {
  initializeStock();
  stockLevels = loadStock();
  return { ...stockLevels };
}

export async function checkAvailability(productId: string, quantity: number): Promise<boolean> {
  initializeStock();
  const available = stockLevels[productId] || 0;
  return available >= quantity;
}

export async function resetStock(): Promise<void> {
  const initialStock: Record<string, number> = {};
  products.forEach((product) => {
    initialStock[product.id] = product.stock;
  });

  stockLevels = initialStock;
  saveStock(stockLevels);
  console.log('🔄 Stock reset to initial values:', stockLevels);
}
