// Home page - Product listing

import { ProductGrid } from '@/components/product/ProductGrid';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Home() {
  return (
    <PageContainer>
      <PageHeader
        title="Produtos"
        description="Encontre os melhores produtos de tecnologia com os melhores precos"
      />
      <ProductGrid initialProducts={[]} />
    </PageContainer>
  );
}
