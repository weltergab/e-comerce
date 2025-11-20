'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface AddToCartButtonProps {
  onAddToCart: (e?: React.MouseEvent) => Promise<void> | void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const AddToCartButton = ({
  onAddToCart,
  disabled = false,
  size = 'md',
  fullWidth = false,
  className = '',
}: AddToCartButtonProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { isMinimalTheme } = useTheme();

  const handleClick = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsAdding(true);

    await onAddToCart(e);

    setIsAdding(false);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
    }, 2000);
  };

  const roundedClass = isMinimalTheme ? '' : 'rounded-lg';
  const baseClasses = `font-semibold ${roundedClass} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`;
  const widthClass = fullWidth ? 'w-full' : '';
  const sizeClass = sizeClasses[size];

  // Use the same style as outline button
  const getStyles = () => {
    if (justAdded) {
      return {
        backgroundColor: '#22c55e',
        border: '2px solid #22c55e',
        color: 'white',
      };
    }
    return {
      backgroundColor: isHovered && !disabled ? 'var(--color-surfaceHover)' : 'transparent',
      border: '2px solid var(--color-primary)',
      color: 'var(--color-primary)',
    };
  };

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} ${sizeClass} ${widthClass} ${className}`}
      style={getStyles()}
      disabled={disabled || isAdding}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isAdding
        ? 'Adicionando...'
        : justAdded
        ? '✓ Adicionado!'
        : disabled
        ? 'Sem Estoque'
        : 'Adicionar ao Carrinho'}
    </button>
  );
};
