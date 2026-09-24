// Home page - Product listing

import { useEffect, useState } from 'react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { IntroductionHeader } from '@/components/layout/IntroductionHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { apiFetch } from '@/lib/api/client';

interface IntroductionHeaderContent {
  title: string;
  subtitle: string;
  description: string;
  miniText: string;
}

const defaultIntroductionHeader: IntroductionHeaderContent = {
  miniText: 'Abacate Shop',
  title: 'Produtos escolhidos para simplificar sua rotina',
  subtitle: 'Tecnologia, praticidade e compra segura em um só lugar.',
  description:
    'Encontre itens selecionados com pagamento integrado, estoque atualizado e uma experiência direta para comprar sem complicação.',
};

export default function Home() {
  const [introductionHeader, setIntroductionHeader] = useState(defaultIntroductionHeader);

  useEffect(() => {
    const loadIntroductionHeader = async () => {
      try {
        const response = await apiFetch('/api/parameters/introduction-header');
        if (!response.ok) return;

        const data = await response.json();
        setIntroductionHeader({
          ...defaultIntroductionHeader,
          ...(data.parameter?.value || {}),
        });
      } catch (error) {
        console.error('Error loading introduction header:', error);
      }
    };

    loadIntroductionHeader();
  }, []);

  return (
    <>
      <IntroductionHeader {...introductionHeader} />
      <PageContainer className="pt-10">
        <PageHeader
          title="Produtos"
          description="Encontre os melhores produtos de tecnologia com os melhores precos"
        />
        <ProductGrid />
      </PageContainer>
    </>
  );
}
