import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase/client';
import { syncAllPendingTransactions } from '@/lib/services/transactions';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const user = authenticateRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verificar se é admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.userId)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    // Sincronizar status de transações pendentes com o Stripe
    await syncAllPendingTransactions();

    // Buscar todas as transações (sem JOIN complexo que pode causar erro)
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Erro ao buscar transações' },
        { status: 500 }
      );
    }

    // Debug logs
    console.log('=== DEBUG TRANSAÇÕES ADMIN ===');
    console.log('Total de transações encontradas:', transactions?.length || 0);
    console.log('Primeira transação (se existir):', transactions?.[0]);
    console.log('==============================');

    // Formatar dados para o frontend
    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      userEmail: transaction.user_email,
      userName: transaction.user_name || 'Usuário desconhecido',
      stripePaymentIntentId: transaction.stripe_payment_intent_id,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      paymentMethod: transaction.payment_method,
      boletoUrl: transaction.boleto_url,
      products: transaction.products,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
      adminNotes: transaction.admin_notes,
      adminNotesUpdatedAt: transaction.admin_notes_updated_at,
      adminNotesUpdatedBy: transaction.admin_notes_updated_by || null,
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      total: formattedTransactions.length,
    });
  } catch (error: any) {
    console.error('Error in transactions API:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
