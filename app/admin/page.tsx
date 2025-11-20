'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminProductCard } from '@/components/admin/AdminProductCard';
import { Button } from '@/components/ui/Button';
import { Product } from '@/types';

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

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      if (!data.user.isAdmin) {
        alert('Acesso negado. Apenas administradores.');
        router.push('/');
        return;
      }

      setUser(data.user);
      loadProducts();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const loadProducts = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      const response = await fetch('/api/admin/products', {
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
      const response = await fetch(`/api/admin/products/${productId}`, {
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
                onClick={() => router.push('/admin/transactions')}
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
                <div className="text-4xl">📦</div>
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
                <div className="text-4xl">✅</div>
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
                <div className="text-4xl">⚠️</div>
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
      const response = await fetch(url, {
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
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div
        className="rounded-lg max-w-md w-full p-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
          {product ? 'Editar Produto' : 'Novo Produto'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Nome do Produto
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 rounded focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 rounded focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Preço (R$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              className="w-full px-3 py-2 rounded focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Estoque
            </label>
            <input
              type="number"
              required
              value={formData.stock}
              onChange={(e) =>
                setFormData({ ...formData, stock: e.target.value })
              }
              className="w-full px-3 py-2 rounded focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              URL da Imagem
            </label>
            <input
              type="url"
              value={formData.images}
              onChange={(e) =>
                setFormData({ ...formData, images: e.target.value })
              }
              className="w-full px-3 py-2 rounded focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded font-semibold transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface)';
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded font-semibold transition-colors disabled:opacity-50"
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
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
