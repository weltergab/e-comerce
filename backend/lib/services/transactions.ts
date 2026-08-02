import '../config/env';
import Stripe from 'stripe';
import { supabase } from '../supabase/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

/**
 * Sincroniza o status de uma transação com o Stripe
 */
export async function syncTransactionStatus(stripePaymentIntentId: string): Promise<string | null> {
  try {
    // Buscar o Payment Intent no Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);

    // Mapear o status do Stripe
    const status = paymentIntent.status;

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
    }

    // Atualizar no banco de dados
    const updateData: any = { status };
    if (paymentMethodType) {
      updateData.payment_method = paymentMethodType;
    }
    if (boletoUrl) {
      updateData.boleto_url = boletoUrl;
    }

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('stripe_payment_intent_id', stripePaymentIntentId);

    if (error) {
      console.error('Error updating transaction status:', error);
      return null;
    }

    return status;
  } catch (error) {
    console.error('Error syncing transaction status:', error);
    return null;
  }
}

/**
 * Sincroniza o status de todas as transações não finalizadas
 */
export async function syncAllPendingTransactions(): Promise<number> {
  try {
    // Buscar transações que não estão succeeded ou canceled
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('stripe_payment_intent_id, status')
      .not('status', 'in', '(succeeded,canceled)');

    if (error || !transactions) {
      console.error('Error fetching pending transactions:', error);
      return 0;
    }

    let updatedCount = 0;

    // Sincronizar cada transação
    for (const transaction of transactions) {
      const newStatus = await syncTransactionStatus(transaction.stripe_payment_intent_id);
      if (newStatus && newStatus !== transaction.status) {
        updatedCount++;
      }
    }

    return updatedCount;
  } catch (error) {
    console.error('Error syncing all transactions:', error);
    return 0;
  }
}
