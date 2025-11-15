// Script to test stock update directly
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

async function testStockUpdate() {
  const productId = 'prod_3'; // Teclado Mecânico RGB

  console.log(`\n🧪 Testing stock update for product ${productId}...\n`);

  try {
    // 1. Get current stock
    const product = await stripe.products.retrieve(productId);
    console.log('Current product:', product.name);
    console.log('Current stock in metadata:', product.metadata.stock || 'Not set');

    // 2. Update stock (subtract 2)
    const currentStock = parseInt(product.metadata.stock || '30');
    const newStock = currentStock - 2;

    console.log(`\nUpdating stock: ${currentStock} → ${newStock}`);

    await stripe.products.update(productId, {
      metadata: {
        stock: newStock.toString(),
      },
    });

    console.log('✅ Stock updated successfully!');

    // 3. Verify update
    const updatedProduct = await stripe.products.retrieve(productId);
    console.log('\nVerification:');
    console.log('New stock in Stripe:', updatedProduct.metadata.stock);

    console.log('\n✅ Test completed successfully!');
    console.log('Check your Stripe Dashboard to see the updated stock.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testStockUpdate();
