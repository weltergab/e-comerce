import type { Product } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProductSummary } from '@/components/product/ProductSummary';
import { Pencil, Trash2 } from 'lucide-react';

interface AdminProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export function AdminProductCard({ product, onEdit, onDelete }: AdminProductCardProps) {
  return (
    <Card hover className="h-full flex flex-col">
      <ProductSummary product={product} actions={
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onEdit(product)} variant="outline" size="sm" fullWidth><Pencil className="w-4 h-4" />Editar</Button>
          <Button onClick={() => onDelete(product.id)} variant="danger" size="sm" fullWidth><Trash2 className="w-4 h-4" />Excluir</Button>
        </div>
      } />
    </Card>
  );
}
