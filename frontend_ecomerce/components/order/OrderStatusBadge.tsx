interface OrderStatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function getOrderStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'succeeded':
      return 'var(--color-success)';
    case 'processing':
    case 'pending':
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return 'var(--color-warning)';
    case 'canceled':
      return 'var(--color-textMuted)';
    case 'failed':
      return 'var(--color-error)';
    default:
      return 'var(--color-error)';
  }
}

export function getOrderStatusText(status: string) {
  switch (status.toLowerCase()) {
    case 'succeeded':
      return 'Pago';
    case 'processing':
    case 'requires_payment_method':
    case 'requires_action':
      return 'Aguardando Pagamento';
    case 'requires_confirmation':
      return 'Aguardando Confirmação';
    case 'canceled':
      return 'Cancelado';
    case 'failed':
      return 'Falhou';
    case 'pending':
      return 'Pendente';
    default:
      return status;
  }
}

export function OrderStatusBadge({ status, label, className = '' }: OrderStatusBadgeProps) {
  const color = getOrderStatusColor(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}
      style={{
        backgroundColor: `${color}24`,
        color,
      }}
    >
      {label || getOrderStatusText(status)}
    </span>
  );
}
