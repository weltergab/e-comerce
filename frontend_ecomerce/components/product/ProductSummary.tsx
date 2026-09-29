import type { ReactNode } from 'react';
import type { Product } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { CardContent, CardImage } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';

export function ProductSummary({ product, actions }: { product: Product; actions: ReactNode }) {
  return (
    <>
      <CardImage src={product.image} images={product.images} alt={product.name} />
      <CardContent className="flex-1 flex flex-col">
        <div className="mb-2"><Badge>{product.category}</Badge></div>
        <h3 className="text-lg font-bold mb-2 line-clamp-1" style={{ color: 'var(--color-text)' }}>{product.name}</h3>
        <div className="h-12 mb-4">
          {product.description && <p className="text-sm line-clamp-2" style={{ color: 'var(--color-textSecondary)' }}>{product.description}</p>}
        </div>
        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{formatCurrency(product.price || 0, product.currency)}</span>
            <span className="text-sm" style={{ color: 'var(--color-textMuted)' }}>Estoque: {product.stock || 0}</span>
          </div>
          {actions}
        </div>
      </CardContent>
    </>
  );
}
