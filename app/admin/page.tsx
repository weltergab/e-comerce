'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

interface Product {
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
        setProducts(data.products);
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

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    router.push('/');
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
                Painel Administrativo
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Bem-vindo, {user?.username}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/')}
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
                Ver Loja
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded transition-colors"
                style={{
                  backgroundColor: 'var(--color-error)',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Gerenciar Produtos
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded font-semibold transition-colors"
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
            + Novo Produto
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={setEditingProduct}
              onDelete={handleDeleteProduct}
            />
          ))}
        </div>

        {products.length === 0 && (
          <div
            className="text-center py-12"
            style={{ color: 'var(--color-textMuted)' }}
          >
            Nenhum produto encontrado. Crie seu primeiro produto!
          </div>
        )}
      </main>

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

// Product Card Component
function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}) {
  const price = product.price?.unit_amount
    ? (product.price.unit_amount / 100).toFixed(2)
    : '0.00';
  const stock = product.metadata?.stock || '0';

  return (
    <div
      className="rounded-lg shadow-md overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 10px 20px -5px var(--color-shadow)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = `0 4px 6px -1px var(--color-shadow)`;
      }}
    >
      {product.images[0] ? (
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div
          className="w-full h-48 flex items-center justify-center"
          style={{
            backgroundColor: 'var(--color-borderLight)',
            color: 'var(--color-textMuted)',
          }}
        >
          Sem imagem
        </div>
      )}
      <div className="p-4">
        <h3
          className="font-semibold text-lg mb-2"
          style={{ color: 'var(--color-text)' }}
        >
          {product.name}
        </h3>
        <p
          className="text-sm mb-3 line-clamp-2"
          style={{ color: 'var(--color-textSecondary)' }}
        >
          {product.description}
        </p>
        <div className="flex justify-between items-center mb-3">
          <span
            className="text-xl font-bold"
            style={{ color: 'var(--color-success)' }}
          >
            R$ {price}
          </span>
          <span className="text-sm" style={{ color: 'var(--color-textMuted)' }}>
            Estoque: {stock}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(product)}
            className="flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors"
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
            Editar
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--color-error)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// Product Modal Component
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
    price: product?.price?.unit_amount
      ? (product.price.unit_amount / 100).toString()
      : '',
    stock: product?.metadata?.stock || '0',
    images: product?.images[0] || '',
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
