import { ReactNode } from 'react';

interface OrderDetailSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  accent?: 'default' | 'warning' | 'primary';
  className?: string;
}

export function OrderDetailSection({
  title,
  icon,
  children,
  accent = 'default',
  className = '',
}: OrderDetailSectionProps) {
  const borderColor =
    accent === 'warning'
      ? 'var(--color-warning)'
      : accent === 'primary'
      ? 'var(--color-primary)'
      : 'var(--color-borderLight)';

  return (
    <section
      className={`rounded-lg p-4 sm:p-5 ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `${accent === 'default' ? '1px' : '2px'} solid ${borderColor}`,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}
