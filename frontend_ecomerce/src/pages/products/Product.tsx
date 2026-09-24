import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/format';
import { AddToCartButton } from '@/components/product/AddToCartButton';
import { ProductImageGallery } from '@/components/product/ProductImageGallery';
import { useProduct } from '@/src/features/catalog/hooks';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { data: product, isLoading } = useProduct(id);
  const [quantity, setQuantity] = useState(1);

  if (isLoading) return <div className="max-w-7xl mx-auto px-4 py-24" role="status">Carregando...</div>;
  if (!product) return <div className="max-w-7xl mx-auto px-4 py-24"><h1 className="text-2xl font-bold">Produto não encontrado</h1><Button onClick={() => navigate('/')} className="mt-4">Voltar</Button></div>;

  const add = async () => { if (await addItem(product, quantity)) navigate('/cart'); };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      <Button onClick={() => navigate(-1)} variant="outline" className="mb-6">← Voltar</Button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProductImageGallery images={product.images.length ? product.images : [product.image]} alt={product.name} className="aspect-square rounded-lg overflow-hidden" />
        <div className="flex flex-col">
          <div className="mb-4"><Badge>{product.category}</Badge></div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-4xl font-bold mb-6" style={{ color: 'var(--color-primary)' }}>{formatCurrency(product.price, product.currency)}</p>
          <h2 className="text-lg font-semibold mb-2">Descrição</h2>
          <p className="leading-relaxed mb-6" style={{ color: 'var(--color-textSecondary)' }}>{product.description}</p>
          <p className="text-sm mb-6">Estoque disponível: <strong>{product.stock} unidades</strong></p>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Quantidade</label>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setQuantity((value) => Math.max(1, value - 1))} variant="outline" size="sm" disabled={quantity <= 1}>-</Button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <Button onClick={() => setQuantity((value) => Math.min(product.stock, 20, value + 1))} variant="outline" size="sm" disabled={quantity >= product.stock || quantity >= 20}>+</Button>
            </div>
          </div>
          <AddToCartButton onAddToCart={add} disabled={product.stock === 0} size="lg" fullWidth className="mb-4" />
          <Button onClick={() => navigate('/')} variant="outline" size="lg">Continuar Comprando</Button>
        </div>
      </div>
    </div>
  );
}
