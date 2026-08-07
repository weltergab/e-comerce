// Card component - reusable UI component

'use client';

import { ReactNode, CSSProperties } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ProductImageGallery } from '@/components/product/ProductImageGallery';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card = ({ children, className = '', hover = false }: CardProps) => {
  const { isMinimalTheme } = useTheme();

  const baseStyles: CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: isMinimalTheme ? '0' : '0.75rem',
    border: isMinimalTheme ? 'none' : '1px solid var(--color-border)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  };

  return (
    <div
      className={className}
      style={baseStyles}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.transform = isMinimalTheme ? 'translateY(-2px)' : 'translateY(-4px)';
          e.currentTarget.style.boxShadow = isMinimalTheme
            ? `0 4px 8px ${CSS.escape('var(--color-shadow)')}`
            : `0 20px 25px -5px ${CSS.escape('var(--color-shadow)')}, 0 10px 10px -5px ${CSS.escape('var(--color-shadow)')}`;
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = isMinimalTheme
            ? 'none'
            : `0 4px 6px -1px ${CSS.escape('var(--color-shadow)')}, 0 2px 4px -1px ${CSS.escape('var(--color-shadow)')}`;
        }
      }}
    >
      {children}
    </div>
  );
};

export const CardImage = ({ src, images, alt }: { src: string; images?: string[]; alt: string }) => {
  return (
    <ProductImageGallery
      images={images?.length ? images : src ? [src] : []}
      alt={alt}
      className="w-full h-80 overflow-hidden"
    />
  );
};

export const CardContent = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <div className={`p-6 ${className}`} style={{ color: 'var(--color-text)' }}>
      {children}
    </div>
  );
};
