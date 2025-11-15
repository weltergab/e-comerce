'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Product } from '@/types';
import { ProductRepository } from '@/lib/data/products';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/format';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [currentStock, setCurrentStock] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      const productRepo = new ProductRepository();
      const productData = await productRepo.getById(params.id as string);
      setProduct(productData);

      if (productData) {
        const stockResponse = await fetch('/api/stock');
        const stockData = await stockResponse.json();
        setCurrentStock(stockData.stock[productData.id] || productData.stock);
      }

      setLoading(false);
    };

    loadProduct();
  }, [params.id]);

  const handleAddToCart = async () => {
    if (product) {
      const success = await addItem(product, quantity);
      if (success) {
        router.push('/cart');
      }
    }
  };

  const incrementQuantity = () => {
    if (quantity < currentStock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold">Produto não encontrado</h1>
        <Button onClick={() => router.push('/')} className="mt-4">
          Voltar para Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        ← Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="aspect-square rounded-lg overflow-hidden bg-gray-200">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <Badge className="w-fit mb-4">{product.category}</Badge>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {product.name}
          </h1>

          <p className="text-4xl font-bold text-blue-600 mb-6">
            {formatCurrency(product.price)}
          </p>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Descrição</h2>
            <p className="text-gray-600 leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Estoque disponível: <span className="font-semibold">{currentStock} unidades</span>
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade
            </label>
            <div className="flex items-center space-x-4">
              <Button
                onClick={decrementQuantity}
                variant="outline"
                size="sm"
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="text-xl font-semibold w-12 text-center">
                {quantity}
              </span>
              <Button
                onClick={incrementQuantity}
                variant="outline"
                size="sm"
                disabled={quantity >= currentStock}
              >
                +
              </Button>
            </div>
          </div>

          <Button
            onClick={handleAddToCart}
            size="lg"
            disabled={currentStock === 0}
            className="mb-4"
          >
            {currentStock > 0 ? 'Adicionar ao Carrinho' : 'Sem Estoque'}
          </Button>

          <Button
            onClick={() => router.push('/')}
            variant="outline"
            size="lg"
          >
            Continuar Comprando
          </Button>
        </div>
      </div>
    </div>
  );
}
