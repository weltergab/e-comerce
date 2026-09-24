// Badge component for displaying categories and status

import { ReactNode, CSSProperties } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Badge = ({ children, variant = 'default' }: BadgeProps) => {
  const { isMinimalTheme } = useTheme();

  const getVariantStyles = (): CSSProperties => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: 'var(--color-success)',
          color: 'white',
          opacity: 0.9,
        };
      case 'warning':
        return {
          backgroundColor: 'var(--color-warning)',
          color: 'white',
          opacity: 0.9,
        };
      case 'error':
        return {
          backgroundColor: 'var(--color-error)',
          color: 'white',
          opacity: 0.9,
        };
      default:
        return {
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-accentText)',
          opacity: 0.9,
        };
    }
  };

  const roundedClass = isMinimalTheme ? '' : 'rounded-full';

  return (
    <span
      className={`inline-block px-3 py-1 ${roundedClass} text-xs font-semibold`}
      style={getVariantStyles()}
    >
      {children}
    </span>
  );
};
