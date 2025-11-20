'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/format';
import { AddToCartButton } from '@/components/product/AddToCartButton';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [currentStock, setCurrentStock] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        // Buscar todos os produtos
        const response = await fetch('/api/products');
        const data = await response.json();

        if (data.success && data.products) {
          // Encontrar o produto pelo ID
          const foundProduct = data.products.find(
            (p: Product) => p.id === params.id
          );

          if (foundProduct) {
            setProduct(foundProduct);

            // Buscar estoque
            const stockResponse = await fetch('/api/stock');
            const stockData = await stockResponse.json();
            setCurrentStock(stockData.stock[foundProduct.id] || foundProduct.stock);
          }
        }
      } catch (error) {
        console.error('Error loading product:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [params.id]);

  const handleAddToCart = async () => {
    if (product) {
      const success = await addItem(product, quantity);

      if (success) {
        setTimeout(() => {
          router.push('/cart');
        }, 1500);
      }
    }
  };

  const incrementQuantity = () => {
    if (quantity < currentStock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="animate-pulse" style={{ color: 'var(--color-text)' }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Produto não encontrado
        </h1>
        <Button onClick={() => router.push('/')} className="mt-4">
          Voltar para Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        ← Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div
          className="aspect-square rounded-lg overflow-hidden"
          style={{ backgroundColor: 'var(--color-borderLight)' }}
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ color: 'var(--color-textMuted)' }}
            >
              Sem imagem
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-4">
            <Badge>{product.category}</Badge>
          </div>

          <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            {product.name}
          </h1>

          <p className="text-4xl font-bold mb-6" style={{ color: 'var(--color-primary)' }}>
            {formatCurrency(product.price)}
          </p>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Descrição
            </h2>
            <p className="leading-relaxed" style={{ color: 'var(--color-textSecondary)' }}>
              {product.description}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
              Estoque disponível:{' '}
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {currentStock} unidades
              </span>
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
              Quantidade
            </label>
            <div className="flex items-center space-x-4">
              <Button
                onClick={decrementQuantity}
                variant="outline"
                size="sm"
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="text-xl font-semibold w-12 text-center text-gray-900">
                {quantity}
              </span>
              <Button
                onClick={incrementQuantity}
                variant="outline"
                size="sm"
                disabled={quantity >= currentStock}
              >
                +
              </Button>
            </div>
          </div>

          <AddToCartButton
            onAddToCart={handleAddToCart}
            disabled={currentStock === 0}
            size="lg"
            fullWidth
            className="mb-4"
          />

          <Button
            onClick={() => router.push('/')}
            variant="outline"
            size="lg"
          >
            Continuar Comprando
          </Button>
        </div>
      </div>
    </div>
  );
}
