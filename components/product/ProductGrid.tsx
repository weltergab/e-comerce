'use client';

import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { useStock } from '@/lib/hooks/useStock';

interface ProductGridProps {
  initialProducts: Product[];
}

export const ProductGrid = ({ initialProducts }: ProductGridProps) => {
  const { stockLevels, loading } = useStock();

  // Merge initial products with live stock levels
  const products = initialProducts.map(product => ({
    ...product,
    stock: stockLevels[product.id] ?? product.stock
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
