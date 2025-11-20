import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase/client';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate request
    const user = authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin, email')
      .eq('id', user.userId)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    // Parse request body
    const { adminNotes } = await req.json();

    // Validate adminNotes (allow null/empty to clear notes)
    if (adminNotes !== null && adminNotes !== undefined && typeof adminNotes !== 'string') {
      return NextResponse.json(
        { error: 'Notas devem ser uma string' },
        { status: 400 }
      );
    }

    // Get transaction to find Stripe Payment Intent ID
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('stripe_payment_intent_id')
      .eq('id', id)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      );
    }

    // Prepare notes data (null or trimmed string)
    const notesValue = adminNotes ? adminNotes.trim() : null;
    const now = notesValue ? new Date().toISOString() : null;

    // Update database
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        admin_notes: notesValue,
        admin_notes_updated_at: now,
        admin_notes_updated_by: notesValue ? user.userId : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar transação' },
        { status: 500 }
      );
    }

    // Update Stripe metadata (best effort, don't fail if it errors)
    try {
      await stripe.paymentIntents.update(
        transaction.stripe_payment_intent_id,
        {
          metadata: {
            admin_notes: notesValue || '',
            admin_notes_updated_at: now || '',
            admin_notes_updated_by: notesValue ? userData.email : '',
          },
        }
      );
    } catch (stripeError) {
      console.error('Error updating Stripe metadata:', stripeError);
      // Don't fail the request - database is source of truth
    }

    return NextResponse.json({
      success: true,
      transaction: {
        ...updatedTransaction,
        adminNotesUpdatedBy: userData.email,
      },
    });
  } catch (error: any) {
    console.error('Error in transaction update:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
