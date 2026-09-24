import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product, CartItem } from '@/types';
import { calculateTotal } from '@/lib/utils/format';
import { getProduct } from '@/src/features/catalog/api';

interface CartContextType {
  items: CartItem[];
  total: number;
  isLoading: boolean;
  addItem: (product: Product, quantity?: number) => Promise<boolean>;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  completeOrder: (purchased: StoredCartItem[]) => void;
}

interface StoredCartItem { productId: string; quantity: number }
const storageKey = 'storecy_cart_v2';
const CartContext = createContext<CartContextType | undefined>(undefined);

function readStoredCart(): StoredCartItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item.productId === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 20);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredCart();
    Promise.allSettled(stored.map(async (item) => ({ product: await getProduct(item.productId), quantity: item.quantity })))
      .then((loaded) => setItems(loaded.filter((item): item is PromiseFulfilledResult<CartItem> => item.status === 'fulfilled').map((item) => item.value).filter((item) => item.product.active !== false && item.product.stock > 0).map((item) => ({ ...item, quantity: Math.min(item.quantity, item.product.stock, 20) }))))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoading) localStorage.setItem(storageKey, JSON.stringify(items.map((item) => ({ productId: item.product.id, quantity: item.quantity }))));
  }, [items, isLoading]);

  const total = useMemo(() => calculateTotal(items.map((item) => ({ price: item.product.price, quantity: item.quantity }))), [items]);

  const addItem = useCallback(async (product: Product, quantity = 1) => {
    const freshProduct = await getProduct(product.id).catch(() => null);
    if (!freshProduct) return false;
    const current = items.find((item) => item.product.id === product.id)?.quantity || 0;
    if (quantity < 1 || current + quantity > freshProduct.stock || current + quantity > 20) {
      window.alert(`Estoque insuficiente. Disponível: ${freshProduct.stock}; no carrinho: ${current}.`);
      return false;
    }
    setItems((values) => values.some((item) => item.product.id === product.id)
      ? values.map((item) => item.product.id === product.id ? { product: freshProduct, quantity: item.quantity + quantity } : item)
      : [...values, { product: freshProduct, quantity }]);
    return true;
  }, [items]);

  const removeItem = useCallback((productId: string) => setItems((values) => values.filter((item) => item.product.id !== productId)), []);
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(productId);
    setItems((values) => values.map((item) => item.product.id === productId ? { ...item, quantity: Math.min(quantity, item.product.stock, 20) } : item));
  }, [removeItem]);
  const completeOrder = useCallback((purchased: StoredCartItem[]) => setItems((values) => values.flatMap((item) => {
    const bought = purchased.find((entry) => entry.productId === item.product.id)?.quantity || 0;
    return item.quantity > bought ? [{ ...item, quantity: item.quantity - bought }] : [];
  })), []);

  return <CartContext.Provider value={{ items, total, isLoading, addItem, removeItem, updateQuantity, completeOrder }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de CartProvider');
  return context;
}
