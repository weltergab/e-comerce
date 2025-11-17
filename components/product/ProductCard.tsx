// ProductCard component - displays product information

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import { Card, CardImage, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/format';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAdding(true);

    const success = await addItem(product);

    if (success) {
      setJustAdded(true);
      setShowToast(true);
      setTimeout(() => {
        setJustAdded(false);
      }, 2000);
    }

    setIsAdding(false);
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
      <Link href={`/products/${product.id}`} className="h-full block">
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
            <p
              className="text-sm mb-4 line-clamp-2"
              style={{ color: 'var(--color-textSecondary)' }}
            >
              {product.description}
            </p>
            <div className="flex items-center justify-between mb-4">
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
            <div className="mt-auto">
              <Button
                onClick={handleAddToCart}
                fullWidth
                className={`transition-all duration-300 ${
                  justAdded
                    ? 'bg-green-600 hover:bg-green-700 scale-105'
                    : ''
                }`}
                disabled={product.stock === 0 || isAdding}
              >
                {isAdding
                  ? 'Adicionando...'
                  : justAdded
                  ? '✓ Adicionado!'
                  : product.stock > 0
                  ? 'Adicionar ao Carrinho'
                  : 'Sem Estoque'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </>
  );
};
