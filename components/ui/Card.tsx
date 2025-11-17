// Card component - reusable UI component

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card = ({ children, className = '', hover = false }: CardProps) => {
  const hoverStyles = hover ? 'hover:shadow-xl transition-shadow duration-300' : '';

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
};

export const CardImage = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <div className="w-full h-64 overflow-hidden bg-gray-200">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <span>Sem imagem</span>
        </div>
      )}
    </div>
  );
};

export const CardContent = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};
