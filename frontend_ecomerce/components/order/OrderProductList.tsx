interface OrderProduct {
  id: string;
  qty: number;
  price: number;
}

interface OrderProductListProps {
  products: OrderProduct[];
  productNames: Record<string, string>;
  currency: string;
  formatCurrency: (amount: number, currency: string) => string;
  showProductId?: boolean;
}

export function OrderProductList({
  products,
  productNames,
  currency,
  formatCurrency,
  showProductId = false,
}: OrderProductListProps) {
  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <div
          key={`${product.id}-${index}`}
          className="rounded-lg p-3 sm:p-4"
          style={{
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-borderLight)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-base mb-1 break-words" style={{ color: 'var(--color-text)' }}>
                {productNames[product.id] || 'Produto'}
              </p>
              {showProductId && (
                <p className="font-mono text-xs break-all" style={{ color: 'var(--color-textMuted)' }}>
                  ID: {product.id}
                </p>
              )}
            </div>
            <div className="sm:text-right flex-shrink-0">
              <p className="text-sm mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                Quantidade: <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{product.qty}</span>
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>
                {formatCurrency(product.price * product.qty, currency)}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                {formatCurrency(product.price, currency)} por unidade
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
