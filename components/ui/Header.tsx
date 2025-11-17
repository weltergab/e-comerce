// Header component with navigation and cart

'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

export const Header = () => {
  const { items } = useCart();
  const { user, logout } = useAuth();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              TechStore
            </Link>

            <nav className="flex items-center space-x-6">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Produtos
              </Link>
              <Link
                href="/cart"
                className="relative text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Carrinho
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {user?.isAdmin && (
                <Link
                  href="/admin"
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium bg-yellow-100 px-3 py-1 rounded"
                >
                  Admin
                </Link>
              )}

              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-700 text-sm">
                    Olá, <span className="font-semibold">{user.username}</span>
                  </span>
                  <Button
                    onClick={logout}
                    variant="outline"
                    size="sm"
                  >
                    Sair
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                  >
                    Login
                  </Link>
                  <Link href="/cadastro">
                    <Button size="sm">
                      Cadastro
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>
  );
};
