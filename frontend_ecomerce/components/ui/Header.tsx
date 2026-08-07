// Header component with navigation and cart

'use client';

import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Menu, ShoppingCart, UserPlus, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

function DesktopNavLink({
  to,
  children,
  highlight = false,
}: {
  to: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition-all"
      style={{
        color: highlight ? 'var(--color-accentText)' : 'var(--color-textSecondary)',
        backgroundColor: highlight ? 'var(--color-accent)' : 'transparent',
        border: '1px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (highlight) return;
        e.currentTarget.style.color = 'var(--color-text)';
        e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)';
        e.currentTarget.style.borderColor = 'var(--color-borderLight)';
      }}
      onMouseLeave={(e) => {
        if (highlight) return;
        e.currentTarget.style.color = 'var(--color-textSecondary)';
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {children}
    </Link>
  );
}

function MobileMenuLink({
  to,
  children,
  onClick,
  highlight = false,
}: {
  to: string;
  children: ReactNode;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold transition-colors"
      style={{
        color: highlight ? 'var(--color-accentText)' : 'var(--color-text)',
        backgroundColor: highlight ? 'var(--color-accent)' : 'var(--color-background)',
        border: '1px solid var(--color-borderLight)',
      }}
      onClick={onClick}
    >
      <span>{children}</span>
      <span style={{ color: highlight ? 'var(--color-accentText)' : 'var(--color-textMuted)' }}>›</span>
    </Link>
  );
}

export const Header = () => {
  const { items } = useCart();
  const { user, logout } = useAuth();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 left-0 right-0 z-50 backdrop-blur"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-7xl mx-auto pb-1 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/"
            className="text-2xl font-extrabold text-green-950 overline"
            style={{  }}
          >
            A B A C A T E - Shop
          </Link>

          <nav className="hidden lg:flex items-center gap-2">
            <DesktopNavLink to="/">Produtos</DesktopNavLink>

            {user && <DesktopNavLink to="/my-orders">Meus Pedidos</DesktopNavLink>}

            <Link
              to="/cart"
              className="relative inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-all"
              style={{
                color: 'var(--color-textSecondary)',
                border: '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text)';
                e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)';
                e.currentTarget.style.borderColor = 'var(--color-borderLight)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-textSecondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <ShoppingCart className="w-4 h-4" />
              Carrinho
              {itemCount > 0 && (
                <span
                  className="absolute -top-2 -right-2 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-error)' }}
                >
                  {itemCount}
                </span>
              )}
            </Link>

            {user?.isAdmin && <DesktopNavLink to="/admin" highlight>Admin</DesktopNavLink>}

            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-3 pl-2">
                <span
                  className="hidden xl:block text-sm"
                  style={{ color: 'var(--color-textSecondary)' }}
                >
                  Olá, <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{user.username}</span>
                </span>
                <Button onClick={logout} variant="ghost" size="sm">
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2">
                <DesktopNavLink to="/login">Login</DesktopNavLink>
                <Link to="/cadastro">
                  <Button size="sm">
                    <UserPlus className="w-4 h-4" />
                    Cadastro
                  </Button>
                </Link>
              </div>
            )}
          </nav>

          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle />

            <Link
              to="/cart"
              className="relative w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-borderLight)',
              }}
            >
              <ShoppingCart size={20} strokeWidth={1.8} />
              {itemCount > 0 && (
                <span
                  className="absolute -top-2 -right-2 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-error)' }}
                >
                  {itemCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-borderLight)',
              }}
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div
          className="lg:hidden"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="grid gap-2">
              <MobileMenuLink to="/" onClick={() => setIsMenuOpen(false)}>
                Produtos
              </MobileMenuLink>

              {user && (
                <MobileMenuLink to="/my-orders" onClick={() => setIsMenuOpen(false)}>
                  Meus Pedidos
                </MobileMenuLink>
              )}

              {user?.isAdmin && (
                <MobileMenuLink to="/admin" onClick={() => setIsMenuOpen(false)} highlight>
                  Admin
                </MobileMenuLink>
              )}
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {user ? (
                <div className="grid gap-3">
                  <div
                    className="text-sm rounded-2xl px-4 py-3"
                    style={{
                      color: 'var(--color-textSecondary)',
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-borderLight)',
                    }}
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
                    <LogOut className="w-4 h-4" />
                    Sair
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" size="sm" fullWidth>
                      Login
                    </Button>
                  </Link>
                  <Link to="/cadastro" onClick={() => setIsMenuOpen(false)}>
                    <Button size="sm" fullWidth>
                      <UserPlus className="w-4 h-4" />
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
