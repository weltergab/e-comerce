// Header component with navigation and cart

'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Menu, ShoppingCart, X } from 'lucide-react';

export const Header = () => {
  const { items } = useCart();
  const { user, logout } = useAuth();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header
      className="shadow-lg top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="text-2xl font-bold"
            style={{ color: 'var(--color-primary)' }}
          >
            TechStore
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            <Link
              to="/"
              className="font-medium"
              style={{ color: 'var(--color-textSecondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-textSecondary)'}
            >
              Produtos
            </Link>
            {user && (
              <Link
                to="/my-orders"
                className="font-medium"
                style={{ color: 'var(--color-textSecondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-textSecondary)'}
              >
                Meus Pedidos
              </Link>
            )}
            <Link
              to="/cart"
              className="relative font-medium"
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
                to="/admin"
                className="font-medium px-3 py-1 rounded"
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
                  className="text-sm"
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
                  to="/login"
                  className="font-medium"
                  style={{ color: 'var(--color-textSecondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-textSecondary)'}
                >
                  Login
                </Link>
                <Link to="/cadastro">
                  <Button size="sm">
                    Cadastro
                  </Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Navigation - 4 items in a row */}
          <div className="flex lg:hidden items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Cart */}
            <Link
              to="/cart"
              className="relative"
              style={{ color: 'var(--color-text)' }}
            >
              <ShoppingCart size={24} strokeWidth={1.5} />
              {itemCount > 0 && (
                <span
                  className="absolute -top-2 -right-2 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-error)' }}
                >
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1"
              style={{ color: 'var(--color-text)' }}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          className="lg:hidden"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
            <Link
              to="/"
              className="block py-2 font-medium"
              style={{ color: 'var(--color-textSecondary)' }}
              onClick={() => setIsMenuOpen(false)}
            >
              Produtos
            </Link>
            {user && (
              <Link
                to="/my-orders"
                className="block py-2 font-medium"
                style={{ color: 'var(--color-textSecondary)' }}
                onClick={() => setIsMenuOpen(false)}
              >
                Meus Pedidos
              </Link>
            )}
            {user?.isAdmin && (
              <Link
                to="/admin"
                className="block py-2 font-medium"
                style={{ color: 'var(--color-textSecondary)' }}
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>
            )}

            <div className="pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {user ? (
                <div className="space-y-3">
                  <div
                    className="text-sm"
                    style={{ color: 'var(--color-textSecondary)' }}
                  >
                    Olá, <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{user.username}</span>
                  </div>
                  <Button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    variant="outline"
                    size="sm"
                    fullWidth
                  >
                    Sair
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" size="sm" fullWidth>
                      Login
                    </Button>
                  </Link>
                  <Link to="/cadastro" onClick={() => setIsMenuOpen(false)}>
                    <Button size="sm" fullWidth>
                      Cadastro
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
