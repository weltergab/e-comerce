import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/Card';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">
          {title}
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-textSecondary)' }}>
          {description}
        </p>
        {action}
      </CardContent>
    </Card>
  );
}
