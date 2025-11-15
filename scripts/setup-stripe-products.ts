// Script to create products and prices in Stripe
// Run with: npm run setup-stripe

import * as dotenv from 'dotenv';
import * as path from 'path';
import Stripe from 'stripe';
import { products } from '../lib/data/products';

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

async function setupStripeProducts() {
  console.log('🔵 Setting up Stripe products...\n');

  for (const product of products) {
    try {
      // Create product in Stripe
      const stripeProduct = await stripe.products.create({
        id: `prod_${product.id}`,
        name: product.name,
        description: product.description,
        images: [product.image],
        metadata: {
          category: product.category,
          stock: product.stock.toString(),
        },
      });

      // Create price for the product
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(product.price * 100), // Convert to cents
        currency: 'brl',
      });

      console.log(`✅ Created: ${product.name}`);
      console.log(`   Product ID: ${stripeProduct.id}`);
      console.log(`   Price ID: ${stripePrice.id}`);
      console.log(`   Amount: R$ ${product.price}\n`);

      // Save the price ID to update your products file
      console.log(`   Add to product: stripePriceId: '${stripePrice.id}',\n`);
    } catch (error: any) {
      if (error.code === 'resource_already_exists') {
        console.log(`⚠️  Product ${product.name} already exists, skipping...\n`);
      } else {
        console.error(`❌ Error creating ${product.name}:`, error.message);
      }
    }
  }

  console.log('\n✅ Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Copy the Price IDs above');
  console.log('2. Update lib/data/products.ts with the stripePriceId for each product');
  console.log('3. View your products at: https://dashboard.stripe.com/test/products');
}

setupStripeProducts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
