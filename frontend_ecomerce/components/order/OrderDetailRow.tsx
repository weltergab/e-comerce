import { ReactNode } from 'react';

interface OrderDetailRowProps {
  label: string;
  children: ReactNode;
}

export function OrderDetailRow({ label, children }: OrderDetailRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-3 py-2">
      <span className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>
        {label}
      </span>
      <div className="min-w-0 text-sm sm:text-base font-semibold break-words" style={{ color: 'var(--color-text)' }}>
        {children}
      </div>
    </div>
  );
}
