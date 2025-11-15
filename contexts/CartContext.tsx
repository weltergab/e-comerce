// Cart Context - State management following Context API pattern

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem } from '@/types';
import { calculateTotal } from '@/lib/utils/format';

interface CartContextType {
  items: CartItem[];
  total: number;
  addItem: (product: Product, quantity?: number) => Promise<boolean>;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const total = calculateTotal(
    items.map((item) => ({ price: item.product.price, quantity: item.quantity }))
  );

  const addItem = async (product: Product, quantity = 1): Promise<boolean> => {
    try {
      const response = await fetch('/api/stock');
      const data = await response.json();
      const availableStock = data.stock[product.id] || 0;

      const currentInCart = items.find(item => item.product.id === product.id)?.quantity || 0;
      const totalNeeded = currentInCart + quantity;

      if (totalNeeded > availableStock) {
        alert(`Estoque insuficiente! Disponível: ${availableStock}, No carrinho: ${currentInCart}`);
        return false;
      }

      setItems((currentItems) => {
        const existingItem = currentItems.find((item) => item.product.id === product.id);

        if (existingItem) {
          return currentItems.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }

        return [...currentItems, { product, quantity }];
      });

      return true;
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
      return false;
    }
  };

  const removeItem = (productId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        total,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
