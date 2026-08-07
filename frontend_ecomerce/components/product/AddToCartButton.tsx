'use client';

import { useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface AddToCartButtonProps {
  onAddToCart: (e?: React.MouseEvent) => Promise<void> | void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm sm:text-base',
  lg: 'px-6 py-3.5 text-base sm:text-lg',
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

  const roundedClass = isMinimalTheme ? '' : 'rounded-full';
  const baseClasses = `inline-flex items-center justify-center gap-2 font-semibold leading-none ${roundedClass} focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200 active:scale-[0.98]`;
  const widthClass = fullWidth ? 'w-full' : '';
  const sizeClass = sizeClasses[size];

  const getStyles = () => {
    if (justAdded) {
      return {
        backgroundColor: '#22c55e',
        border: '1px solid #22c55e',
        color: 'white',
        boxShadow: '0 4px 10px var(--color-shadow)',
      };
    }

    return {
      backgroundColor: disabled
        ? 'var(--color-buttonSecondaryBg)'
        : isHovered
        ? 'var(--color-primaryHover)'
        : 'var(--color-primary)',
      border: '1px solid transparent',
      color: disabled ? 'var(--color-textMuted)' : 'var(--color-primaryText)',
      boxShadow: disabled ? 'none' : '0 4px 10px var(--color-shadow)',
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
      {justAdded && <Check className="w-4 h-4" />}
      {!justAdded && !disabled && <ShoppingCart className="w-4 h-4" />}
      {isAdding ? 'Adicionando...' : justAdded ? 'Adicionado!' : disabled ? 'Sem Estoque' : 'Adicionar ao carrinho'}
    </button>
  );
};
