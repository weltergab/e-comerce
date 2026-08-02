// ProductCard component - displays product information

'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '@/types';
import { Card, CardImage, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/format';
import { useCart } from '@/contexts/CartContext';
import { AddToCartButton } from './AddToCartButton';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const [showToast, setShowToast] = useState(false);

  const handleAddToCart = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const success = await addItem(product);

    if (success) {
      setShowToast(true);
    }
  };

  return (
    <>
      {showToast && (
        <Toast
          message={`${product.name} adicionado ao carrinho!`}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
      <Link to={`/products/${product.id}`} className="h-full block">
        <Card hover className="h-full flex flex-col">
          <CardImage src={product.image} alt={product.name} />
          <CardContent className="flex-1 flex flex-col">
            <div className="mb-2">
              <Badge>{product.category}</Badge>
            </div>
            <h3
              className="text-lg font-bold mb-2 line-clamp-1"
              style={{ color: 'var(--color-text)' }}
            >
              {product.name}
            </h3>
            {/* Descrição com altura fixa para manter alinhamento */}
            <div className="h-12 mb-4">
              {product.description && (
                <p
                  className="text-sm line-clamp-2"
                  style={{ color: 'var(--color-textSecondary)' }}
                >
                  {product.description}
                </p>
              )}
            </div>
            <div className="mt-auto space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {formatCurrency(product.price)}
                </span>
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-textMuted)' }}
                >
                  Estoque: {product.stock}
                </span>
              </div>
              <AddToCartButton
                onAddToCart={handleAddToCart}
                disabled={product.stock === 0}
                size="sm"
              />
            </div>
          </CardContent>
        </Card>
      </Link>
    </>
  );
};
