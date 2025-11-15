// Home page - Product listing

import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductRepository } from '@/lib/data/products';

export default async function Home() {
  const productRepo = new ProductRepository();
  const products = await productRepo.getAll();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Produtos em Destaque
        </h1>
        <p className="text-gray-600">
          Encontre os melhores produtos de tecnologia com os melhores preços
        </p>
      </div>

      <ProductGrid initialProducts={products} />
    </div>
  );
}
