// Home page - Product listing

import { ProductGrid } from '@/components/product/ProductGrid';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Produtos em Destaque
        </h1>
        <p style={{ color: 'var(--color-textSecondary)' }}>
          Encontre os melhores produtos de tecnologia com os melhores preços
        </p>
      </div>

      <ProductGrid initialProducts={[]} />
    </div>
  );
}
