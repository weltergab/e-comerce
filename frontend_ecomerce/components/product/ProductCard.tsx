// ProductCard component - displays product information

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '@/types';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { useCart } from '@/contexts/CartContext';
import { AddToCartButton } from './AddToCartButton';
import { ProductSummary } from './ProductSummary';

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
          <ProductSummary product={product} actions={
              <AddToCartButton
                onAddToCart={handleAddToCart}
                disabled={product.stock === 0}
                size="sm"
                fullWidth
              />
          } />
        </Card>
      </Link>
    </>
  );
};
