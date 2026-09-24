import type { OrderProduct } from '@/types';
import { formatCurrency } from '@/lib/utils/format';

export function OrderProductList({ products, currency, showProductId = false }: { products: OrderProduct[]; currency: string; showProductId?: boolean }) {
  return <div className="space-y-3">{products.map((product) => <div key={product.id} className="rounded-lg p-3 sm:p-4" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-borderLight)' }}>
    <div className="flex flex-col sm:flex-row sm:justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{product.name}</p>{showProductId && <p className="font-mono text-xs break-all" style={{ color: 'var(--color-textMuted)' }}>ID: {product.id}</p>}</div>
      <div className="sm:text-right"><p className="text-sm">Quantidade: <strong>{product.qty}</strong></p><p className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>{formatCurrency(product.price * product.qty, currency)}</p><p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>{formatCurrency(product.price, currency)} por unidade</p></div>
    </div>
  </div>)}</div>;
}
