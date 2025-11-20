import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase/client';
import { syncTransactionStatus } from '@/lib/services/transactions';

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

    // Buscar transações do usuário atual
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching user transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Erro ao buscar transações' },
        { status: 500 }
      );
    }

    // Sincronizar status de transações não finalizadas
    const pendingTransactions = transactions.filter(
      (t) => t.status !== 'succeeded' && t.status !== 'canceled'
    );

    for (const transaction of pendingTransactions) {
      await syncTransactionStatus(transaction.stripe_payment_intent_id);
    }

    // Buscar novamente após sincronização
    const { data: updatedTransactions, error: updatedError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (updatedError) {
      console.error('Error fetching updated transactions:', updatedError);
      return NextResponse.json(
        { error: 'Erro ao buscar transações' },
        { status: 500 }
      );
    }

    // Formatar dados para o frontend
    const formattedTransactions = updatedTransactions.map((transaction) => ({
      id: transaction.id,
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
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      total: formattedTransactions.length,
    });
  } catch (error: any) {
    console.error('Error in my-transactions API:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
