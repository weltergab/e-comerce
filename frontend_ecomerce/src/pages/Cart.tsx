// Shopping Cart page

'use client';

import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency } from '@/lib/utils/format';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, total, removeItem, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          title="Seu carrinho esta vazio"
          description="Adicione produtos ao carrinho para continuar"
          action={<Button onClick={() => navigate('/')}>Ir para Produtos</Button>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Carrinho de Compras" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.product.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--color-borderLight)' }}>
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        Sem imagem
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold mb-1">
                      {item.product.name}
                    </h3>
                    <p className="text-sm mb-2" style={{ color: 'var(--color-textSecondary)' }}>
                      {item.product.category}
                    </p>
                    <p className="font-bold" style={{ color: 'var(--color-primary)' }}>
                      {formatCurrency(item.product.price)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        variant="outline"
                        size="sm"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        variant="outline"
                        size="sm"
                        disabled={item.quantity >= item.product.stock}
                      >
                        +
                      </Button>
                    </div>

                    <p className="font-bold text-lg">
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>

                    <Button
                      onClick={() => removeItem(item.product.id)}
                      variant="danger"
                      size="sm"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Resumo do Pedido
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between" style={{ color: 'var(--color-textSecondary)' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--color-textSecondary)' }}>
                  <span>Frete</span>
                  <span style={{ color: 'var(--color-success)' }}>Gratis</span>
                </div>
                <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate('/checkout')}
                fullWidth
                size="lg"
                className="mb-3"
              >
                Finalizar Compra
              </Button>

              <Button
                onClick={() => navigate('/')}
                variant="outline"
                fullWidth
              >
                Continuar Comprando
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
