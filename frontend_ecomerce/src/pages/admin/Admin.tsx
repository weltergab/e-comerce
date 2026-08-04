'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminProductCard } from '@/components/admin/AdminProductCard';
import { Button } from '@/components/ui/Button';
import { Product } from '@/types';
import { Package, CheckCircle, AlertTriangle, Tag, FileText, DollarSign, Box, Image, MessageSquare } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  active: boolean;
  metadata: {
    stock?: string;
  };
  price: {
    id: string;
    unit_amount: number | null;
    currency: string;
  } | null;
}

interface HealthService {
  ok: boolean;
  label: string;
  message: string;
  checkedAt: string;
  uptimeSeconds?: number;
  mode?: string;
}

interface HealthCheck {
  ok: boolean;
  checkedAt: string;
  services: {
    backend: HealthService;
    database: HealthService;
    stripe: HealthService;
  };
}

interface IntroductionHeaderContent {
  title: string;
  subtitle: string;
  description: string;
  miniText: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

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
      loadProducts();
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/login');
    }
  };

  const loadProducts = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      const response = await apiFetch('/api/admin/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Converter produtos do Stripe para o formato do Product
        const convertedProducts: Product[] = data.products.map((p: StripeProduct) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: p.price?.unit_amount ? p.price.unit_amount / 100 : 0,
          image: p.images[0] || '',
          category: 'Produtos',
          stock: parseInt(p.metadata?.stock || '0'),
        }));
        setProducts(convertedProducts);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    try {
      const response = await apiFetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Produto excluído com sucesso!');
        loadProducts();
      } else {
        alert('Erro ao excluir produto');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Erro ao excluir produto');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleCheckHealth = async () => {
    const token = localStorage.getItem('auth_token');
    setHealthLoading(true);

    try {
      const response = await apiFetch('/api/admin/health', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erro ao verificar conexoes');
        return;
      }

      setHealthCheck(data);
    } catch (error) {
      console.error('Error checking health:', error);
      alert('Erro ao verificar conexoes');
    } finally {
      setHealthLoading(false);
    }
  };

  if (loading) {
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
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1
                className="text-3xl font-bold mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Painel Administrativo
              </h1>
              <p style={{ color: 'var(--color-textSecondary)' }}>
                Bem-vindo, {user?.username}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleCheckHealth}
                variant="outline"
                size="md"
                disabled={healthLoading}
              >
                {healthLoading ? 'Verificando...' : 'Verificar Conexoes'}
              </Button>
              <Button
                onClick={() => setShowIntroModal(true)}
                variant="outline"
                size="md"
                className="inline-flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Editar Frases
              </Button>
              <Button
                onClick={() => navigate('/admin/transactions')}
                variant="outline"
                size="md"
              >
                Ver Transações
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="primary"
                size="md"
              >
                + Novo Produto
              </Button>
            </div>
          </div>

          {healthCheck && (
            <div
              className="rounded-lg p-5 mb-6"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Status das Conexoes
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  Atualizado em {new Date(healthCheck.checkedAt).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  healthCheck.services.backend,
                  healthCheck.services.database,
                  healthCheck.services.stripe,
                ].map((service) => (
                  <div
                    key={service.label}
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-borderLight)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                          {service.label}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                          {service.message}
                        </p>
                        {service.mode && (
                          <p className="text-xs mt-2" style={{ color: 'var(--color-textMuted)' }}>
                            Modo: {service.mode}
                          </p>
                        )}
                        {service.uptimeSeconds !== undefined && (
                          <p className="text-xs mt-2" style={{ color: 'var(--color-textMuted)' }}>
                            Uptime: {service.uptimeSeconds}s
                          </p>
                        )}
                      </div>
                      {service.ok ? (
                        <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                      ) : (
                        <AlertTriangle className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                    Produtos Cadastrados
                  </h3>
                  <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                    {products.length}
                  </p>
                </div>
                <Package className="w-10 h-10" style={{ color: 'var(--color-primary)' }} />
              </div>
            </div>

            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                    Em Estoque
                  </h3>
                  <p className="text-3xl font-bold" style={{ color: 'var(--color-success)' }}>
                    {products.filter(p => p.stock > 0).length}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10" style={{ color: 'var(--color-success)' }} />
              </div>
            </div>

            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                    Sem Estoque
                  </h3>
                  <p className="text-3xl font-bold" style={{ color: 'var(--color-error)' }}>
                    {products.filter(p => p.stock === 0).length}
                  </p>
                </div>
                <AlertTriangle className="w-10 h-10" style={{ color: 'var(--color-error)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Gerenciar Produtos
          </h2>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div
            className="rounded-lg p-12 text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p className="text-xl mb-4" style={{ color: 'var(--color-text)' }}>
              Nenhum produto encontrado
            </p>
            <p className="mb-6" style={{ color: 'var(--color-textSecondary)' }}>
              Crie seu primeiro produto!
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              + Novo Produto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <AdminProductCard
                key={product.id}
                product={product}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
              />
            ))}
          </div>
        )}
      </div>

      {showIntroModal && (
        <IntroductionHeaderModal onClose={() => setShowIntroModal(false)} />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ProductModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadProducts();
          }}
        />
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <ProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

// Product Modal Component (mantido igual)
function ProductModal({
  product,
  onClose,
  onSuccess,
}: {
  product?: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    stock: product?.stock?.toString() || '0',
    images: product?.image || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem('auth_token');
    const url = product
      ? `/api/admin/products/${product.id}`
      : '/api/admin/products';
    const method = product ? 'PUT' : 'POST';

    try {
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          images: formData.images ? [formData.images] : [],
        }),
      });

      if (response.ok) {
        alert(
          product
            ? 'Produto atualizado com sucesso!'
            : 'Produto criado com sucesso!'
        );
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao salvar produto');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg max-w-2xl w-full p-8 max-h-[85vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-background)',
          border: '2px solid var(--color-borderLight)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-borderLight)',
              }}
            >
              <Package className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                {product ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                {product ? 'Atualize as informações do produto' : 'Preencha os dados do novo produto'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  <label className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Nome do Produto *
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-borderLight)',
                    color: 'var(--color-text)',
                  }}
                  placeholder="Ex: Camiseta Básica Preta"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  <label className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Descrição
                  </label>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-borderLight)',
                    color: 'var(--color-text)',
                    resize: 'vertical',
                  }}
                  rows={4}
                  placeholder="Descreva o produto..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                    <label className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      Preço (R$) *
                    </label>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-borderLight)',
                      color: 'var(--color-text)',
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Box className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                    <label className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      Estoque *
                    </label>
                  </div>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-borderLight)',
                      color: 'var(--color-text)',
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Image className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  <label className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    URL da Imagem
                  </label>
                </div>
                <input
                  type="url"
                  value={formData.images}
                  onChange={(e) =>
                    setFormData({ ...formData, images: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-borderLight)',
                    color: 'var(--color-text)',
                  }}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
                {formData.images && (
                  <div className="mt-3">
                    <img
                      src={formData.images}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                      style={{ border: '1px solid var(--color-borderLight)' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg font-semibold transition-colors"
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
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primaryText)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primaryHover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                }
              }}
            >
              {loading ? 'Salvando...' : product ? 'Atualizar Produto' : 'Criar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IntroductionHeaderModal({ onClose }: { onClose: () => void }) {
  const defaultForm: IntroductionHeaderContent = {
    miniText: 'Storecy',
    title: 'Produtos escolhidos para simplificar sua rotina',
    subtitle: 'Tecnologia, praticidade e compra segura em um so lugar.',
    description:
      'Encontre itens selecionados com pagamento integrado, estoque atualizado e uma experiencia direta para comprar sem complicacao.',
  };
  const [formData, setFormData] = useState<IntroductionHeaderContent>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadParameter = async () => {
      const token = localStorage.getItem('auth_token');

      try {
        const response = await apiFetch('/api/admin/parameters/introduction-header', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (response.ok) {
          setFormData({
            ...defaultForm,
            ...(data.parameter?.value || {}),
          });
        } else {
          alert(data.error || 'Erro ao carregar frases');
        }
      } catch (error) {
        console.error('Error loading introduction header parameter:', error);
        alert('Erro ao carregar frases');
      } finally {
        setLoading(false);
      }
    };

    loadParameter();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    setSaving(true);

    try {
      const response = await apiFetch('/api/admin/parameters/introduction-header', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erro ao salvar frases');
        return;
      }

      alert('Frases salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Error saving introduction header parameter:', error);
      alert('Erro ao salvar frases');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2';
  const fieldStyle = {
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-borderLight)',
    color: 'var(--color-text)',
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg max-w-2xl w-full p-8 max-h-[85vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-background)',
          border: '2px solid var(--color-borderLight)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-borderLight)',
              }}
            >
              <MessageSquare className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                Frases da Introducao
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Textos exibidos no topo da pagina inicial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-3xl leading-none transition-colors p-2 rounded-lg"
            style={{ color: 'var(--color-textSecondary)' }}
          >
            x
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-textSecondary)' }}>Carregando frases...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Mini texto
              </label>
              <input
                value={formData.miniText}
                onChange={(e) => setFormData({ ...formData, miniText: e.target.value })}
                className={fieldClass}
                style={fieldStyle}
                maxLength={80}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Titulo principal
              </label>
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={fieldClass}
                style={fieldStyle}
                maxLength={120}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Subtitulo
              </label>
              <input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className={fieldClass}
                style={fieldStyle}
                maxLength={160}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Descricao
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={fieldClass}
                style={{ ...fieldStyle, resize: 'vertical' }}
                rows={4}
                maxLength={360}
                required
              />
            </div>

            <div className="flex gap-4 pt-2">
              <Button type="button" variant="secondary" fullWidth onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" fullWidth disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Frases'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
