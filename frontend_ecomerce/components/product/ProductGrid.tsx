import { ProductCard } from './ProductCard';
import { useProducts } from '@/src/features/catalog/hooks';

export function ProductGrid() {
  const { data, isLoading, isError, refetch } = useProducts();
  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" role="status">{Array.from({ length: 9 }, (_, index) => <div key={index} className="bg-gray-200 animate-pulse rounded-lg h-96" />)}</div>;
  if (isError) return <div className="text-center py-12"><p className="mb-4">Não foi possível carregar o catálogo.</p><button className="underline" onClick={() => refetch()}>Tentar novamente</button></div>;
  if (!data?.products.length) return <p className="text-center py-12">Nenhum produto disponível.</p>;
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">{data.products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}
