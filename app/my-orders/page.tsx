'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Package, CheckCircle, DollarSign, ShoppingBag, Calendar, FileText, CreditCard, Receipt, ClipboardList, User } from 'lucide-react';

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
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/my-orders');
      return;
    }

    if (user) {
      loadTransactions();
      loadProductNames();
    }
  }, [user, authLoading, router]);

  const loadProductNames = async () => {
    try {
      const response = await fetch('/api/products');
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
      const response = await fetch('/api/my-transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      } else if (response.status === 401) {
        router.push('/login?redirect=/my-orders');
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'var(--color-success)';
      case 'processing':
        return 'var(--color-warning)';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'var(--color-warning)';
      case 'canceled':
        return 'var(--color-textMuted)';
      default:
        return 'var(--color-error)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'Pago';
      case 'processing':
        return 'Aguardando Pagamento';
      case 'requires_payment_method':
        return 'Aguardando Pagamento';
      case 'requires_confirmation':
        return 'Aguardando Confirmação';
      case 'requires_action':
        return 'Aguardando Pagamento';
      case 'canceled':
        return 'Cancelado';
      default:
        return status;
    }
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
    <div className="min-h-screen pt-24" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--color-text)' }}
          >
            Meus Pedidos
          </h1>
          <p className="text-base" style={{ color: 'var(--color-textSecondary)' }}>
            Histórico de todas as suas compras
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-textSecondary)' }}>
                  Total de Pedidos
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {transactions.length}
                </p>
              </div>
              <Package className="w-10 h-10" style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>

          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-textSecondary)' }}>
                  Pedidos Pagos
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                  {transactions.filter((t) => t.status === 'succeeded').length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10" style={{ color: 'var(--color-success)' }} />
            </div>
          </div>

          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-textSecondary)' }}>
                  Valor Total Gasto
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                  {formatCurrency(
                    transactions
                      .filter((t) => t.status === 'succeeded')
                      .reduce((sum, t) => sum + t.amount, 0),
                    'BRL'
                  )}
                </p>
              </div>
              <DollarSign className="w-10 h-10" style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div
            className="rounded-lg p-16 text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <ShoppingBag className="w-20 h-20 mb-6 mx-auto" style={{ color: 'var(--color-textMuted)' }} />
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              Você ainda não fez nenhum pedido
            </h2>
            <p className="text-base mb-8" style={{ color: 'var(--color-textSecondary)' }}>
              Comece a comprar agora e aproveite nossas ofertas!
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 rounded-lg font-semibold transition-colors"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primaryText)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primaryHover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              }}
            >
              Ver Produtos
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              Histórico de Pedidos
            </h2>
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-lg p-6 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-borderLight)',
                }}
                onClick={() => setSelectedTransaction(transaction)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 16px var(--color-shadow)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                        Pedido #{transaction.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${getStatusColor(transaction.status)}30`,
                          color: getStatusColor(transaction.status),
                        }}
                      >
                        {getStatusText(transaction.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" style={{ color: 'var(--color-textSecondary)' }} />
                      <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-textMuted)' }}>
                      {transaction.products.length} {transaction.products.length === 1 ? 'item' : 'itens'}
                    </p>
                    {transaction.adminNotes && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-1 rounded flex items-center gap-1" style={{
                          color: 'var(--color-warning)',
                          backgroundColor: `var(--color-warning)20`,
                        }}>
                          <FileText className="w-3 h-3" />
                          Possui observações
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-3">
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    <button
                      className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      style={{
                        color: 'var(--color-primary)',
                        border: '2px solid var(--color-primary)',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTransaction(transaction);
                      }}
                    >
                      Ver Detalhes →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          productNames={productNames}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

// Transaction Details Modal Component
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'var(--color-success)';
      case 'processing':
        return 'var(--color-warning)';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'var(--color-warning)';
      case 'canceled':
        return 'var(--color-textMuted)';
      default:
        return 'var(--color-error)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'Pago';
      case 'processing':
        return 'Aguardando Pagamento';
      case 'requires_payment_method':
        return 'Aguardando Pagamento';
      case 'requires_confirmation':
        return 'Aguardando Confirmação';
      case 'requires_action':
        return 'Aguardando Pagamento';
      case 'canceled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg max-w-3xl w-full p-8 max-h-[85vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-background)',
          border: '2px solid var(--color-borderLight)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              Detalhes do Pedido
            </h2>
            <span
              className="px-4 py-2 rounded-full text-sm font-semibold inline-block"
              style={{
                backgroundColor: `${getStatusColor(transaction.status)}30`,
                color: getStatusColor(transaction.status),
              }}
            >
              {getStatusText(transaction.status)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-3xl leading-none transition-colors p-2 rounded-lg"
            style={{ color: 'var(--color-textSecondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-error)';
              e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-textSecondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Order Info */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Informações do Pedido
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="font-medium" style={{ color: 'var(--color-textSecondary)' }}>
                  Número do Pedido:
                </span>
                <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  #{transaction.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-medium" style={{ color: 'var(--color-textSecondary)' }}>
                  Data e Hora:
                </span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  {formatDate(transaction.createdAt)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-medium" style={{ color: 'var(--color-textSecondary)' }}>
                  ID da Transação:
                </span>
                <span className="font-mono text-xs truncate max-w-[200px]" style={{ color: 'var(--color-textMuted)' }}>
                  {transaction.stripePaymentIntentId}
                </span>
              </div>
            </div>
          </div>

          {/* Products */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Itens do Pedido ({transaction.products.length})
              </h3>
            </div>
            <div className="space-y-3">
              {transaction.products.map((product, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-borderLight)',
                  }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-base mb-1" style={{ color: 'var(--color-text)' }}>
                        {productNames[product.id] || 'Produto'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                        Quantidade: <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{product.qty}</span>
                      </p>
                      <p className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>
                        {formatCurrency(product.price * product.qty, transaction.currency)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        {formatCurrency(product.price, transaction.currency)} por unidade
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Notes - if present */}
          {transaction.adminNotes && (
            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '2px solid var(--color-warning)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Observações Importantes
                </h3>
              </div>
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-borderLight)',
                }}
              >
                <p
                  className="whitespace-pre-wrap"
                  style={{ color: 'var(--color-text)', lineHeight: '1.6' }}
                >
                  {transaction.adminNotes}
                </p>
              </div>
            </div>
          )}

          {/* Boleto Button - if boleto payment and URL available */}
          {transaction.paymentMethod === 'boleto' && transaction.boletoUrl && (
            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '2px solid var(--color-primary)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                      Pagamento por Boleto
                    </h3>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                    {transaction.status === 'succeeded'
                      ? 'Boleto pago com sucesso!'
                      : 'Clique no botão abaixo para acessar seu boleto bancário'}
                  </p>
                </div>
                {transaction.status !== 'succeeded' && (
                  <a
                    href={transaction.boletoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-background)',
                      border: '2px solid var(--color-primary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                      e.currentTarget.style.color = 'var(--color-background)';
                    }}
                  >
                    Acessar Boleto
                  </a>
                )}
              </div>
              {transaction.status !== 'succeeded' && (
                <div
                  className="mt-4 p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-borderLight)',
                    color: 'var(--color-textSecondary)',
                  }}
                >
                  <p className="mb-1">
                    ⏰ <strong>Atenção:</strong> O boleto expira em 3 dias após a geração.
                  </p>
                  <p>
                    Após o pagamento, seu pedido será processado automaticamente em até 2 dias úteis.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '2px solid var(--color-borderLight)',
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-6 h-6" style={{ color: 'var(--color-text)' }} />
                <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  Total do Pedido:
                </span>
              </div>
              <span className="text-3xl font-bold" style={{ color: 'var(--color-success)' }}>
                {formatCurrency(transaction.amount, transaction.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-lg font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primaryText)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primaryHover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
