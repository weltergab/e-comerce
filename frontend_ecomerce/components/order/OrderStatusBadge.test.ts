import { describe, expect, it } from 'vitest';
import { getOrderStatusText } from './OrderStatusBadge';

describe('paymentStatusPresentation', () => {
  it.each([
    ['succeeded', 'Pago'],
    ['processing', 'Aguardando Pagamento'],
    ['failed', 'Falhou'],
    ['canceled', 'Cancelado'],
    ['refunded', 'Reembolsado'],
  ])('apresenta %s como %s', (status, label) => {
    expect(getOrderStatusText(status)).toBe(label);
  });
});
