'use client';

import { Product } from '@/types';
import { Card, CardImage, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/format';
import { Button } from '@/components/ui/Button';

interface AdminProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const AdminProductCard = ({ product, onEdit, onDelete }: AdminProductCardProps) => {
  const price = product.price || 0;
  const stock = product.stock || 0;

  return (
    <Card hover className="h-full flex flex-col">
      <CardImage src={product.image} images={product.images} alt={product.name} />
      <CardContent className="flex-1 flex flex-col">
        <div className="mb-2">
          <Badge>{product.category}</Badge>
        </div>
        <h3
          className="text-lg font-bold mb-2 line-clamp-1"
          style={{ color: 'var(--color-text)' }}
        >
          {product.name}
        </h3>
        {/* Descrição com altura fixa para manter alinhamento */}
        <div className="h-12 mb-4">
          {product.description && (
            <p
              className="text-sm line-clamp-2"
              style={{ color: 'var(--color-textSecondary)' }}
            >
              {product.description}
            </p>
          )}
        </div>
        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between">
            <span
              className="text-2xl font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              {formatCurrency(price)}
            </span>
            <span
              className="text-sm"
              style={{ color: 'var(--color-textMuted)' }}
            >
              Estoque: {stock}
            </span>
          </div>

          {/* Botões de Admin */}
          <div className="flex gap-2">
            <Button
              onClick={() => onEdit(product)}
              variant="primary"
              size="sm"
              fullWidth
            >
              Editar
            </Button>
            <Button
              onClick={() => onDelete(product.id)}
              variant="danger"
              size="sm"
              fullWidth
            >
              Excluir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
