'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, DollarSign, ShoppingBag, Calendar, FileText, CreditCard, Receipt, ClipboardList, User } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

interface Product {
  id: string;
  qty: number;
  price: number;
  name?: string;
}

interface Transaction {
  id: string;
  userEmail: string;
  userName: string;
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
  adminNotesUpdatedAt?: string | null;
  adminNotesUpdatedBy?: string | null;
}

export default function TransactionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadProductNames();
  }, []);

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

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await apiFetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        navigate('/login');
        return;
      }

      const data = await response.json();
      if (!data.user.isAdmin) {
        alert('Acesso negado. Apenas administradores.');
        navigate('/');
        return;
      }

      setUser(data.user);
      loadTransactions();
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/login');
    }
  };

  const loadTransactions = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      const response = await apiFetch('/api/admin/transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
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
      case 'failed':
        return 'var(--color-error)';
      case 'pending':
        return 'var(--color-warning)';
      default:
        return 'var(--color-textMuted)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'Sucesso';
      case 'failed':
        return 'Falhou';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="text-xl" style={{ color: 'var(--color-text)' }}>
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header
        className="shadow-lg"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                Histórico de Transações
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Todas as transações de todos os usuários
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 rounded transition-colors"
                style={{
                  color: 'var(--color-textSecondary)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-textSecondary)';
                }}
              >
                Voltar ao Painel
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  Total de Transações
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {transactions.length}
                </p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  Transações Bem-Sucedidas
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                  {transactions.filter((t) => t.status === 'succeeded').length}
                </p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  Valor Total
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
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div
          className="rounded-lg shadow-md overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                style={{
                  backgroundColor: 'var(--color-background)',
                  borderBottom: '2px solid var(--color-border)',
                }}
              >
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="transition-colors"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-text)' }}>
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-text)' }}>
                      {transaction.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                      {transaction.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${getStatusColor(transaction.status)}20`,
                          color: getStatusColor(transaction.status),
                        }}
                      >
                        {getStatusText(transaction.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="font-medium transition-colors"
                        style={{ color: 'var(--color-primary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-primaryHover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--color-primary)';
                        }}
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div
              className="text-center py-12"
              style={{ color: 'var(--color-textMuted)' }}
            >
              Nenhuma transação encontrada.
            </div>
          )}
        </div>
      </main>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          productNames={productNames}
          onClose={() => setSelectedTransaction(null)}
          onUpdate={loadTransactions}
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
  onUpdate,
}: {
  transaction: Transaction;
  productNames: Record<string, string>;
  onClose: () => void;
  onUpdate?: () => void;
}) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(transaction.adminNotes || '');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await apiFetch(`/api/admin/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes: notes.trim() || null }),
      });

      if (response.ok) {
        setIsEditingNotes(false);
        alert('Notas salvas com sucesso!');
        if (onUpdate) onUpdate();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao salvar notas');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erro ao salvar notas');
    } finally {
      setIsSaving(false);
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
              Detalhes da Transação
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

          {/* User Info */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Informações do Cliente
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="font-medium" style={{ color: 'var(--color-textSecondary)' }}>
                  Nome:
                </span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{transaction.userName}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-medium" style={{ color: 'var(--color-textSecondary)' }}>
                  Email:
                </span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{transaction.userEmail}</span>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: transaction.adminNotes ? '2px solid var(--color-warning)' : '1px solid var(--color-borderLight)',
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Notas do Administrador
                </h3>
              </div>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-sm px-4 py-2 rounded-lg transition-colors font-medium"
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
                >
                  {transaction.adminNotes ? 'Editar Nota' : 'Adicionar Nota'}
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações importantes sobre esta transação..."
                  rows={5}
                  className="w-full p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-borderLight)',
                    color: 'var(--color-text)',
                    resize: 'vertical',
                    fontSize: '14px',
                  }}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primaryText)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.currentTarget.style.backgroundColor = 'var(--color-primaryHover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving) {
                        e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                      }
                    }}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Nota'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingNotes(false);
                      setNotes(transaction.adminNotes || '');
                    }}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-borderLight)',
                      color: 'var(--color-text)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-background)';
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {transaction.adminNotes ? (
                  <div>
                    <div
                      className="p-4 rounded-lg mb-3"
                      style={{
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-borderLight)',
                      }}
                    >
                      <p
                        className="whitespace-pre-wrap"
                        style={{
                          color: 'var(--color-text)',
                          lineHeight: '1.6',
                        }}
                      >
                        {transaction.adminNotes}
                      </p>
                    </div>
                    {transaction.adminNotesUpdatedAt && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        <Calendar className="w-3 h-3" />
                        <p>
                          Última atualização: {formatDate(transaction.adminNotesUpdatedAt)}
                          {transaction.adminNotesUpdatedBy && ` • por ${transaction.adminNotesUpdatedBy}`}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center py-4" style={{ color: 'var(--color-textMuted)' }}>
                    Nenhuma observação adicionada ainda.
                  </p>
                )}
              </div>
            )}
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
                      <p className="font-mono text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        ID: {product.id}
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
                      : 'Clique no botão abaixo para acessar o boleto bancário'}
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
