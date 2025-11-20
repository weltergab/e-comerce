import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateStock } from '@/lib/services/stock';
import { supabase } from '@/lib/supabase/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
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
      case 'payment_intent.created':
      case 'payment_intent.processing':
        const processingPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentProcessing(processingPayment);
        break;

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

async function handlePaymentProcessing(paymentIntent: Stripe.PaymentIntent) {
  console.log('\n⏳ ========================================');
  console.log('🔄 Payment processing:', paymentIntent.id);
  console.log('Status:', paymentIntent.status);
  console.log('========================================\n');

  // Extract products and user data from metadata
  const productsData = paymentIntent.metadata.products;
  const userEmail = paymentIntent.metadata.userEmail;
  const userId = paymentIntent.metadata.userId;
  const userName = paymentIntent.metadata.userName;

  if (!productsData) {
    console.error('❌ No products in metadata');
    return;
  }

  try {
    const products = JSON.parse(productsData);

    // Get payment method details
    const paymentMethod = paymentIntent.payment_method
      ? await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string)
      : null;

    const paymentMethodType = paymentMethod?.type ||
      (paymentIntent.next_action?.type === 'boleto_display_details' ? 'boleto' : null);

    // Get boleto URL if available
    let boletoUrl: string | null = null;
    if (paymentIntent.next_action?.type === 'boleto_display_details') {
      boletoUrl = paymentIntent.next_action.boleto_display_details?.hosted_voucher_url || null;
      console.log('🎫 Boleto URL found:', boletoUrl);
    }

    // Check if transaction already exists
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (existing) {
      // Update existing transaction
      console.log('📝 Updating existing transaction...');
      const { error } = await supabase
        .from('transactions')
        .update({
          status: paymentIntent.status,
          payment_method: paymentMethodType,
          boleto_url: boletoUrl,
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (error) {
        console.error('❌ Error updating transaction:', error);
      } else {
        console.log('✅ Transaction updated');
      }
    } else {
      // Create new transaction
      console.log('💾 Creating new transaction...');
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId || null,
          user_email: userEmail || 'unknown',
          user_name: userName || 'Usuário desconhecido',
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          payment_method: paymentMethodType,
          boleto_url: boletoUrl,
          products: products,
        });

      if (error) {
        console.error('❌ Error creating transaction:', error);
      } else {
        console.log('✅ Transaction created');
      }
    }

    console.log('\n✅ Payment processing recorded');
  } catch (error) {
    console.error('❌ Error handling payment processing:', error);
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  console.log('\n🎉 ========================================');
  console.log('💰 Payment succeeded:', paymentIntent.id);
  console.log('========================================\n');

  // Extract products from metadata
  const productsData = paymentIntent.metadata.products;
  const userEmail = paymentIntent.metadata.userEmail;
  const userId = paymentIntent.metadata.userId;
  const userName = paymentIntent.metadata.userName;

  if (!productsData) {
    console.error('❌ No products in metadata');
    console.log('Metadata:', paymentIntent.metadata);
    return;
  }

  try {
    const products = JSON.parse(productsData);
    console.log('📦 Products to update:', products);

    // Check if transaction already exists
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (existing) {
      // Update existing transaction to succeeded
      console.log('📝 Updating transaction to succeeded...');
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'succeeded',
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (error) {
        console.error('❌ Error updating transaction:', error);
      } else {
        console.log('✅ Transaction updated to succeeded');
      }
    } else {
      // Save new transaction to database
      console.log('\n💾 Saving transaction to database...');
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId || null,
          user_email: userEmail || 'unknown',
          user_name: userName || 'Usuário desconhecido',
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          status: 'succeeded',
          products: products,
        })
        .select()
        .single();

      if (transactionError) {
        console.error('❌ Error saving transaction:', transactionError);
      } else {
        console.log('✅ Transaction saved:', transactionData?.id);
      }
    }

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
