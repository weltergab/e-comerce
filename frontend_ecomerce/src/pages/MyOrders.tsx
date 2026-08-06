'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, CreditCard, FileText, Receipt, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { OrderDetailRow } from '@/components/order/OrderDetailRow';
import { OrderDetailSection } from '@/components/order/OrderDetailSection';
import { OrderProductList } from '@/components/order/OrderProductList';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api/client';

interface Product {
  id: string;
  qty: number;
  price: number;
  name?: string;
}

interface Transaction {
  id: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  boletoUrl?: string | null;
  products: Product[];
  createdAt: string;
  updatedAt: string;
  adminNotes?: string | null;
}

export default function MyOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/my-orders');
      return;
    }

    if (user) {
      loadTransactions();
      loadProductNames();
    }
  }, [user, authLoading, navigate]);

  const loadProductNames = async () => {
    try {
      const response = await apiFetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        const names: Record<string, string> = {};
        data.products.forEach((product: any) => {
          names[product.id] = product.name;
        });
        setProductNames(names);
      }
    } catch (error) {
      console.error('Error loading product names:', error);
    }
  };

  const loadTransactions = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      const response = await apiFetch('/api/my-transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      } else if (response.status === 401) {
        navigate('/login?redirect=/my-orders');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (authLoading || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pt-24"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="text-xl" style={{ color: 'var(--color-text)' }}>
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Meus Pedidos"
        description="Acompanhe suas compras, pagamentos e observações importantes em um só lugar."
      />

      {transactions.length === 0 ? (
        <EmptyState
          title="Você ainda não fez nenhum pedido"
          description="Comece a comprar agora e seus pedidos aparecerão aqui."
          action={<Button onClick={() => navigate('/')}>Ver Produtos</Button>}
        />
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <button
              key={transaction.id}
              type="button"
              className="w-full rounded-lg p-4 sm:p-5 text-left transition-all"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-borderLight)',
              }}
              onClick={() => setSelectedTransaction(transaction)}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                      Pedido #{transaction.id.slice(0, 8).toUpperCase()}
                    </h2>
                    <OrderStatusBadge status={transaction.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(transaction.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      {transaction.products.length} {transaction.products.length === 1 ? 'item' : 'itens'}
                    </span>
                    {transaction.adminNotes && (
                      <span className="inline-flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                        <FileText className="w-4 h-4" />
                        Possui observação
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col md:items-end justify-between md:justify-center gap-3">
                  <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                    Ver detalhes
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          productNames={productNames}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </PageContainer>
  );
}

function TransactionModal({
  transaction,
  productNames,
  onClose,
}: {
  transaction: Transaction;
  productNames: Record<string, string>;
  onClose: () => void;
}) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-6 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg w-[calc(100vw-1rem)] sm:w-full max-w-4xl p-4 sm:p-6 max-h-[92vh] sm:max-h-[88vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-background)',
          border: '2px solid var(--color-borderLight)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              Detalhes do Pedido
            </h2>
            <OrderStatusBadge status={transaction.status} className="text-sm" />
          </div>
          <button
            onClick={onClose}
            className="text-3xl leading-none transition-colors p-2 rounded-lg flex-shrink-0"
            style={{ color: 'var(--color-textSecondary)' }}
            aria-label="Fechar detalhes do pedido"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <OrderDetailSection
            title="Informacoes do Pedido"
            icon={<ClipboardList className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />}
          >
            <OrderDetailRow label="Numero do pedido">
              #{transaction.id.slice(0, 8).toUpperCase()}
            </OrderDetailRow>
            <OrderDetailRow label="Data e hora">
              {formatDate(transaction.createdAt)}
            </OrderDetailRow>
            <OrderDetailRow label="ID da transação">
              <span className="font-mono text-xs break-all" style={{ color: 'var(--color-textMuted)' }}>
                {transaction.stripePaymentIntentId}
              </span>
            </OrderDetailRow>
          </OrderDetailSection>

          <OrderDetailSection
            title={`Itens do Pedido (${transaction.products.length})`}
            icon={<ShoppingBag className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />}
          >
            <OrderProductList
              products={transaction.products}
              productNames={productNames}
              currency={transaction.currency}
              formatCurrency={formatCurrency}
            />
          </OrderDetailSection>

          {transaction.adminNotes && (
            <OrderDetailSection
              title="Observacoes Importantes"
              accent="warning"
              icon={<FileText className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />}
            >
              <div
                className="rounded-lg p-3 sm:p-4"
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-borderLight)',
                }}
              >
                <p className="whitespace-pre-wrap leading-7" style={{ color: 'var(--color-text)' }}>
                  {transaction.adminNotes}
                </p>
              </div>
            </OrderDetailSection>
          )}

          {transaction.paymentMethod === 'boleto' && transaction.boletoUrl && (
            <OrderDetailSection
              title="Pagamento por Boleto"
              accent="primary"
              icon={<Receipt className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  {transaction.status === 'succeeded'
                    ? 'Boleto pago com sucesso.'
                    : 'Acesse o boleto bancario para concluir o pagamento.'}
                </p>
                {transaction.status !== 'succeeded' && (
                  <a
                    href={transaction.boletoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-lg font-semibold text-center transition-all duration-200"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primaryText)',
                    }}
                  >
                    Acessar Boleto
                  </a>
                )}
              </div>
            </OrderDetailSection>
          )}

          <OrderDetailSection
            title="Total do Pedido"
            icon={<CreditCard className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold" style={{ color: 'var(--color-textSecondary)' }}>
                Valor pago
              </span>
              <span className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-success)' }}>
                {formatCurrency(transaction.amount, transaction.currency)}
              </span>
            </div>
          </OrderDetailSection>
        </div>

        <div className="mt-5">
          <Button onClick={onClose} fullWidth>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
