interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">
        {title}
      </h1>
      {description && (
        <p style={{ color: 'var(--color-textSecondary)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
