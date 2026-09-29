import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminProductCard } from '@/components/admin/AdminProductCard';
import { AdminDialog, AdminDialogHeader } from '@/components/admin/AdminDialog';
import { ProductImageManager, ProductImageManagerHandle } from '@/components/admin/ProductImageManager';
import { Button } from '@/components/ui/Button';
import { Product } from '@/types';
import { Activity, Package, CheckCircle, AlertTriangle, Tag, FileText, DollarSign, Box, MessageSquare, Plus, ReceiptText } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  active: boolean;
  category?: string;
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

function InventoryStat({ title, value, color, icon }: { title: string; value: number; color: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{title}</h3>
          <p className="text-3xl font-bold" style={{ color }}>{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await apiFetch('/api/admin/products?limit=100');

      if (response.ok) {
        const data = await response.json();
        // Converter produtos do Stripe para o formato do Product
        const convertedProducts: Product[] = data.products.map((p: StripeProduct) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: p.price?.unit_amount ? p.price.unit_amount / 100 : 0,
          currency: p.price?.currency || 'brl',
          image: p.images[0] || '',
          images: p.images || [],
          category: p.category || 'Geral',
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

    try {
      const response = await apiFetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
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
    setHealthLoading(true);

    try {
      const response = await apiFetch('/api/admin/health');
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div
            className="rounded-2xl p-5 sm:p-6 mb-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="min-w-0">
              <h1
                className="text-2xl sm:text-3xl font-bold mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Painel Administrativo
              </h1>
              <p className="text-sm sm:text-base mb-3" style={{ color: 'var(--color-textSecondary)' }}>
                Bem-vindo, {user?.username}
              </p>
              <p className="text-sm sm:text-base leading-relaxed max-w-4xl" style={{ color: 'var(--color-textSecondary)' }}>
                Sistema de gerenciamento de catálogo, estoque e pedidos, com pagamentos processados pelo Stripe.
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl p-3 sm:p-4 mb-6"
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="min-h-20 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primaryText)',
                  border: '1px solid transparent',
                }}
              >
                <Plus className="w-5 h-5 mb-2" />
                <span className="block text-sm font-bold">Novo produto</span>
                <span className="block text-xs opacity-80">Cadastrar item</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/orders')}
                className="min-h-20 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-borderLight)',
                }}
              >
                <ReceiptText className="w-5 h-5 mb-2" style={{ color: 'var(--color-primary)' }} />
                <span className="block text-sm font-bold">Pedidos</span>
                <span className="block text-xs" style={{ color: 'var(--color-textSecondary)' }}>Histórico e filtros</span>
              </button>

              <button
                type="button"
                onClick={() => setShowIntroModal(true)}
                className="min-h-20 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-borderLight)',
                }}
              >
                <MessageSquare className="w-5 h-5 mb-2" style={{ color: 'var(--color-primary)' }} />
                <span className="block text-sm font-bold">Frases</span>
                <span className="block text-xs" style={{ color: 'var(--color-textSecondary)' }}>Topo da loja</span>
              </button>

              <button
                type="button"
                onClick={handleCheckHealth}
                disabled={healthLoading}
                className="min-h-20 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-borderLight)',
                }}
              >
                <Activity className="w-5 h-5 mb-2" style={{ color: 'var(--color-primary)' }} />
                <span className="block text-sm font-bold">{healthLoading ? 'Verificando' : 'Conexões'}</span>
                <span className="block text-xs" style={{ color: 'var(--color-textSecondary)' }}>Backend, banco e Stripe</span>
              </button>
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
                  Status das Conexões
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
            <InventoryStat title="Produtos cadastrados" value={products.length} color="var(--color-primary)" icon={<Package className="w-10 h-10" style={{ color: 'var(--color-primary)' }} />} />

            <InventoryStat title="Em estoque" value={products.filter((product) => product.stock > 0).length} color="var(--color-success)" icon={<CheckCircle className="w-10 h-10" style={{ color: 'var(--color-success)' }} />} />

            <InventoryStat title="Sem estoque" value={products.filter((product) => product.stock === 0).length} color="var(--color-error)" icon={<AlertTriangle className="w-10 h-10" style={{ color: 'var(--color-error)' }} />} />
          </div>
        </div>

        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
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
    images: product?.images?.length ? product.images : product?.image ? [product.image] : [],
  });
  const [loading, setLoading] = useState(false);
  const [hasPendingImages, setHasPendingImages] = useState(false);
  const imageManagerRef = useRef<ProductImageManagerHandle>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = product
      ? `/api/admin/products/${product.id}`
      : '/api/admin/products';
    const method = product ? 'PUT' : 'POST';

    try {
      const uploadedImages = await imageManagerRef.current?.uploadPendingImages();
      const imagesToSave = uploadedImages || formData.images;

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          images: imagesToSave,
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
    } catch (error: unknown) {
      console.error('Error saving product:', error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminDialog onClose={onClose}>
        <AdminDialogHeader
          icon={<Package className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />}
          title={product ? 'Editar Produto' : 'Novo Produto'}
          description={product ? 'Atualize as informações do produto' : 'Preencha os dados do novo produto'}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="rounded-lg p-3 sm:p-5"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-borderLight)',
            }}
          >
            <div className="space-y-4">
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
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:outline-none focus:ring-2"
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
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-borderLight)',
                    color: 'var(--color-text)',
                    resize: 'vertical',
                  }}
                  rows={3}
                  placeholder="Descreva o produto..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:outline-none focus:ring-2"
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
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-borderLight)',
                      color: 'var(--color-text)',
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <ProductImageManager
                ref={imageManagerRef}
                images={formData.images}
                onChange={(images) => setFormData({ ...formData, images })}
                onPendingChange={setHasPendingImages}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-5 py-3 rounded-full font-semibold transition-all active:scale-[0.98]"
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
              className="w-full px-5 py-3 rounded-full font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
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
              {loading
                ? hasPendingImages
                  ? 'Enviando fotos...'
                  : 'Salvando...'
                : product
                  ? 'Atualizar Produto'
                  : 'Criar Produto'}
            </button>
          </div>
        </form>
    </AdminDialog>
  );
}

function IntroductionHeaderModal({ onClose }: { onClose: () => void }) {
  const defaultForm: IntroductionHeaderContent = {
    miniText: 'Abacate Shop',
    title: 'Produtos escolhidos para simplificar sua rotina',
    subtitle: 'Tecnologia, praticidade e compra segura em um só lugar.',
    description:
      'Encontre itens selecionados com pagamento integrado, estoque atualizado e uma experiência direta para comprar sem complicação.',
  };
  const [formData, setFormData] = useState<IntroductionHeaderContent>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadParameter = async () => {
      try {
        const response = await apiFetch('/api/admin/parameters/introduction-header');
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
    setSaving(true);

    try {
      const response = await apiFetch('/api/admin/parameters/introduction-header', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
    <AdminDialog onClose={onClose}>
        <AdminDialogHeader
          icon={<MessageSquare className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />}
          title="Frases da Introdução"
          description="Textos exibidos no topo da página inicial"
          onClose={onClose}
        />

        {loading ? (
          <p style={{ color: 'var(--color-textSecondary)' }}>Carregando frases...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={fieldClass}
                style={{ ...fieldStyle, resize: 'vertical' }}
                rows={3}
                maxLength={360}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Button type="button" variant="secondary" fullWidth onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" fullWidth disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Frases'}
              </Button>
            </div>
          </form>
        )}
    </AdminDialog>
  );
}
