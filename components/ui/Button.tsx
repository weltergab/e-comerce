// Button component following Open/Closed Principle (extensible via variants)

import { ButtonHTMLAttributes, ReactNode, CSSProperties, useState } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
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
  const [isHovered, setIsHovered] = useState(false);

  const getVariantStyles = (): CSSProperties => {
    const baseStyle: CSSProperties = {
      transition: 'all 0.2s ease',
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: isHovered && !disabled ? 'var(--color-primaryHover)' : 'var(--color-primary)',
          color: 'var(--color-primaryText)',
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: isHovered && !disabled ? 'var(--color-surfaceHover)' : 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: isHovered && !disabled ? 'var(--color-surfaceHover)' : 'transparent',
          color: 'var(--color-primary)',
          border: '2px solid var(--color-primary)',
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: 'var(--color-error)',
          color: 'white',
          opacity: isHovered && !disabled ? 0.9 : 1,
        };
      default:
        return baseStyle;
    }
  };

  const baseClasses = 'font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizeStyles = sizes[size];
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${sizeStyles} ${widthStyles} ${className}`}
      style={getVariantStyles()}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </button>
  );
};
