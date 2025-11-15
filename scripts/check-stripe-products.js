// Script to check and list all products in Stripe
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

async function checkProducts() {
  console.log('🔍 Checking Stripe products...\n');

  try {
    const products = await stripe.products.list({ limit: 100 });

    console.log(`Found ${products.data.length} products in Stripe:\n`);

    products.data.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Metadata:`, product.metadata);
      console.log('');
    });

    if (products.data.length === 0) {
      console.log('❌ No products found in Stripe!');
      console.log('You need to create products in Stripe Dashboard first.');
      console.log('Or the code is using Price IDs instead of Product IDs.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProducts();
