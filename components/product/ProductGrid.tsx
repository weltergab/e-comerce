'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { useStock } from '@/lib/hooks/useStock';

interface ProductGridProps {
  initialProducts: Product[];
}

export const ProductGrid = ({ initialProducts }: ProductGridProps) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const { stockLevels } = useStock();

  // Fetch products from Stripe on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Keep initial products on error
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Merge products with live stock levels
  const productsWithStock = products.map(product => ({
    ...product,
    stock: stockLevels[product.id] ?? product.stock
  }));

  if (loading && products.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-200 animate-pulse rounded-lg h-96"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {productsWithStock.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
