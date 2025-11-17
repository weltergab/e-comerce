// Header component with navigation and cart

'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export const Header = () => {
  const { items } = useCart();
  const { user, logout } = useAuth();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header
      className="shadow-lg sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-2xl font-bold transition-colors"
            style={{ color: 'var(--color-primary)' }}
          >
            TechStore
          </Link>

          <nav className="flex items-center space-x-4 md:space-x-6">
            <Link
              href="/"
              className="transition-colors font-medium hidden sm:block"
              style={{ color: 'var(--color-textSecondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-textSecondary)'}
            >
              Produtos
            </Link>
            <Link
              href="/cart"
              className="relative transition-colors font-medium"
              style={{ color: 'var(--color-textSecondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-textSecondary)'}
            >
              Carrinho
              {itemCount > 0 && (
                <span
                  className="absolute -top-2 -right-3 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-error)' }}
                >
                  {itemCount}
                </span>
              )}
            </Link>

            {user?.isAdmin && (
              <Link
                href="/admin"
                className="transition-colors font-medium px-3 py-1 rounded hidden md:block"
                style={{
                  color: 'var(--color-accentText)',
                  backgroundColor: 'var(--color-accent)',
                }}
              >
                Admin
              </Link>
            )}

            <ThemeToggle />

            {user ? (
              <div className="flex items-center space-x-3">
                <span
                  className="text-sm hidden lg:block"
                  style={{ color: 'var(--color-textSecondary)' }}
                >
                  Olá, <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{user.username}</span>
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
                  className="transition-colors font-medium hidden sm:block"
                  style={{ color: 'var(--color-textSecondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-textSecondary)'}
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
