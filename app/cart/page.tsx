// Shopping Cart page

'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';

export default function CartPage() {
  const router = useRouter();
  const { items, total, removeItem, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Seu carrinho está vazio
            </h2>
            <p className="text-gray-600 mb-6">
              Adicione produtos ao carrinho para continuar
            </p>
            <Button onClick={() => router.push('/')}>
              Ir para Produtos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Carrinho de Compras
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.product.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        Sem imagem
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {item.product.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {item.product.category}
                    </p>
                    <p className="text-blue-600 font-bold">
                      {formatCurrency(item.product.price)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end justify-between">
                    <Button
                      onClick={() => removeItem(item.product.id)}
                      variant="danger"
                      size="sm"
                    >
                      Remover
                    </Button>

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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Resumo do Pedido
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Frete</span>
                  <span className="text-green-600">Grátis</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-blue-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => router.push('/checkout')}
                fullWidth
                size="lg"
                className="mb-3"
              >
                Finalizar Compra
              </Button>

              <Button
                onClick={() => router.push('/')}
                variant="outline"
                fullWidth
              >
                Continuar Comprando
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
