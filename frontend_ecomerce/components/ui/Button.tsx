'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) => {
  const { isMinimalTheme } = useTheme();

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-theme-button-primary text-[var(--color-primaryText)] hover:bg-theme-button-primary-secondary';
      case 'secondary':
        return 'bg-theme-button-secondary text-[var(--color-text)] hover:bg-theme-button-secondary-secondary border border-[var(--color-border)]';
      case 'outline':
        return 'bg-transparent text-[var(--color-buttonPrimaryBg)] hover:bg-theme-button-secondary-secondary border-2 border-[var(--color-buttonPrimaryBg)]';
      case 'danger':
        return 'bg-[var(--color-error)] text-white hover:opacity-90';
      case 'ghost':
        return 'bg-transparent text-[var(--color-text)] border-none';
      default:
        return '';
    }
  };

  const roundedClass = isMinimalTheme ? '' : 'rounded-lg';
  const minimalSecondaryBorder = isMinimalTheme && variant === 'secondary' ? 'border-[var(--color-text)]' : '';
  const baseClasses = `font-semibold ${roundedClass} transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed`;
  const sizeStyles = sizes[size];
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${getVariantClasses()} ${minimalSecondaryBorder} ${sizeStyles} ${widthStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
