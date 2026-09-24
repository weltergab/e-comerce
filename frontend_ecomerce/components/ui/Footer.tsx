import { Link } from 'react-router-dom';
import { Github, Mail, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer
      className="mt-12"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link
              to="/"
              className="inline-block text-xl font-bold mb-3"
              style={{ color: 'var(--color-primary)' }}
            >
              Abacate Shop
            </Link>
            <p className="max-w-md text-sm" style={{ color: 'var(--color-textSecondary)' }}>
              Tecnologia e pagamento seguro.
            </p>
          </div>

          <nav aria-label="Links do rodape">
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
              Loja
            </h2>
            <div className="space-y-2 text-sm">
              <Link className="block hover:opacity-80" to="/" style={{ color: 'var(--color-textSecondary)' }}>
                Produtos
              </Link>
              <Link className="block hover:opacity-80" to="/cart" style={{ color: 'var(--color-textSecondary)' }}>
                Carrinho
              </Link>
              <Link className="block hover:opacity-80" to="/my-orders" style={{ color: 'var(--color-textSecondary)' }}>
                Meus Pedidos
              </Link>
            </div>
          </nav>

          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
              Atendimento
            </h2>
            <div className="space-y-2 text-sm" style={{ color: 'var(--color-textSecondary)' }}>
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Pagamento Stripe
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                gavvelvv@gmail.com
              </p>
              <p className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                Abacate Shop
              </p>
            </div>
          </div>
        </div>

        <div
          className="mt-8 pt-4 text-xs flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderTop: '1px solid var(--color-border)',
            color: 'var(--color-textMuted)',
          }}
        >
          <span>© {new Date().getFullYear()} Abacate Shop.</span>
          <span>...</span>
        </div>
      </div>
    </footer>
  );
}
