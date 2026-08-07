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
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm sm:text-base',
  lg: 'px-6 py-3.5 text-base sm:text-lg',
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
        return 'bg-theme-button-primary text-[var(--color-primaryText)] border border-transparent shadow-sm hover:bg-theme-button-primary-secondary hover:shadow-md active:scale-[0.98]';
      case 'secondary':
        return 'bg-theme-button-secondary text-[var(--color-text)] hover:bg-theme-button-secondary-secondary border border-[var(--color-borderLight)] shadow-sm active:scale-[0.98]';
      case 'outline':
        return 'bg-transparent text-[var(--color-buttonPrimaryBg)] hover:bg-theme-button-secondary-secondary border border-[var(--color-borderLight)] shadow-sm active:scale-[0.98]';
      case 'danger':
        return 'bg-[var(--color-error)] text-white border border-transparent shadow-sm hover:opacity-90 active:scale-[0.98]';
      case 'ghost':
        return 'bg-transparent text-[var(--color-text)] border border-transparent hover:bg-theme-button-secondary-secondary active:scale-[0.98]';
      default:
        return '';
    }
  };

  const roundedClass = isMinimalTheme ? '' : 'rounded-full';
  const minimalSecondaryBorder = isMinimalTheme && variant === 'secondary' ? 'border-[var(--color-text)]' : '';
  const baseClasses = `inline-flex items-center justify-center gap-2 font-semibold leading-none ${roundedClass} transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`;
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
