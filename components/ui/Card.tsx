// Card component - reusable UI component

import { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card = ({ children, className = '', hover = false }: CardProps) => {
  const baseStyles: CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: '0.75rem',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  };

  return (
    <div
      className={className}
      style={baseStyles}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = `0 20px 25px -5px ${CSS.escape('var(--color-shadow)')}, 0 10px 10px -5px ${CSS.escape('var(--color-shadow)')}`;
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `0 4px 6px -1px ${CSS.escape('var(--color-shadow)')}, 0 2px 4px -1px ${CSS.escape('var(--color-shadow)')}`;
        }
      }}
    >
      {children}
    </div>
  );
};

export const CardImage = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <div
      className="w-full h-64 overflow-hidden"
      style={{ backgroundColor: 'var(--color-borderLight)' }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ color: 'var(--color-textMuted)' }}
        >
          <span>Sem imagem</span>
        </div>
      )}
    </div>
  );
};

export const CardContent = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <div className={`p-6 ${className}`} style={{ color: 'var(--color-text)' }}>
      {children}
    </div>
  );
};
