import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateStock } from '@/lib/services/stock';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  console.log('\n🔔 ======== WEBHOOK RECEIVED ========');
  console.log('Webhook secret configured:', webhookSecret ? 'YES' : 'NO');
  console.log('Webhook secret value:', webhookSecret);

  try {
    const body = await req.text();
    console.log('Body received, length:', body.length);

    const signature = req.headers.get('stripe-signature');
    console.log('Signature header:', signature ? 'Present' : 'Missing');

    if (!signature) {
      console.error('❌ No Stripe signature found in headers');
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error('❌ Webhook secret not configured in environment');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Signature verified successfully');
      console.log('Event type:', event.type);
      console.log('Event ID:', event.id);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      console.error('Error details:', err);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('⚠️ Payment failed:', failedPayment.id);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    console.log('✅ Webhook processed successfully');
    console.log('======== WEBHOOK COMPLETE ========\n');
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('❌ Webhook handler error:', error);
    console.error('Error stack:', error.stack);
    console.log('======== WEBHOOK FAILED ========\n');
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  console.log('\n🎉 ========================================');
  console.log('💰 Payment succeeded:', paymentIntent.id);
  console.log('========================================\n');

  // Extract products from metadata
  const productsData = paymentIntent.metadata.products;

  if (!productsData) {
    console.error('❌ No products in metadata');
    console.log('Metadata:', paymentIntent.metadata);
    return;
  }

  try {
    const products = JSON.parse(productsData);
    console.log('📦 Products to update:', products);

    // Update stock for each product
    for (const item of products) {
      console.log(`\n🔄 Processing item:`, item);
      const success = await updateStock(item.id, item.qty);

      if (success) {
        console.log(`✅ Stock updated successfully for product ${item.id}: -${item.qty}`);
      } else {
        console.error(`❌ Failed to update stock for product ${item.id}`);
      }
    }

    console.log('\n✅ ========================================');
    console.log('✅ Order processed successfully');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Error processing order:', error);
  }
}
