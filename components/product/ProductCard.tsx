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
      <Link href={`/products/${product.id}`}>
        <Card hover>
          <CardImage src={product.image} alt={product.name} />
          <CardContent>
          <div className="mb-2">
            <Badge>{product.category}</Badge>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(product.price)}
            </span>
            <span className="text-sm text-gray-500">
              Estoque: {product.stock}
            </span>
          </div>
          <Button
            onClick={handleAddToCart}
            fullWidth
            className={`mt-4 transition-all duration-300 ${
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
        </CardContent>
      </Card>
    </Link>
    </>
  );
};
