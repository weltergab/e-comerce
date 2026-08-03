import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}

export function PageContainer({ children, className = '', narrow = false }: PageContainerProps) {
  const widthClass = narrow ? 'max-w-md' : 'max-w-7xl';

  return (
    <div className={`${widthClass} mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 ${className}`}>
      {children}
    </div>
  );
}
