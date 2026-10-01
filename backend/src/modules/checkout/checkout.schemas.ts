import { AppError } from '../../shared/errors';

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

export interface ShippingAddressInput {
  recipient: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'BR';
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(400, 'INVALID_BODY', 'Corpo da requisição inválido.');
  }
  return value as Record<string, unknown>;
}

export function parseShippingAddress(value: unknown): ShippingAddressInput {
  const address = object(value);
  const allowedKeys = new Set(['recipient', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'postalCode', 'country']);
  if (Object.keys(address).some((key) => !allowedKeys.has(key))) {
    throw new AppError(400, 'UNEXPECTED_ADDRESS_FIELD', 'O endereço contém campos não permitidos.');
  }
  const required: Array<keyof Omit<ShippingAddressInput, 'complement' | 'country'>> = [
    'recipient', 'street', 'number', 'neighborhood', 'city', 'state', 'postalCode',
  ];
  const shipping = {} as ShippingAddressInput;
  for (const field of required) {
    const fieldValue = typeof address[field] === 'string' ? address[field].trim() : '';
    const maximum = field === 'number' ? 40 : 160;
    if (!fieldValue || fieldValue.length > maximum) {
      throw new AppError(400, 'INVALID_SHIPPING_ADDRESS', `Campo ${field} do endereço é obrigatório.`);
    }
    shipping[field] = fieldValue;
  }
  shipping.state = shipping.state.toUpperCase();
  shipping.postalCode = shipping.postalCode.replace(/\D/g, '');
  if (!/^[A-Z]{2}$/.test(shipping.state) || !/^\d{8}$/.test(shipping.postalCode)) {
    throw new AppError(400, 'INVALID_SHIPPING_ADDRESS', 'UF ou CEP inválido.');
  }
  shipping.complement = typeof address.complement === 'string' ? address.complement.trim().slice(0, 160) : '';
  shipping.country = 'BR';
  return shipping;
}

export function parseCheckout(body: unknown) {
  const value = object(body);
  const allowedKeys = new Set(['items', 'shippingAddress', 'shippingAddressId']);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new AppError(400, 'UNEXPECTED_CHECKOUT_FIELD', 'O checkout aceita somente itens e endereço de entrega.');
  }
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 50) {
    throw new AppError(400, 'INVALID_CART_SIZE', 'O carrinho deve conter de 1 a 50 itens.');
  }

  const seen = new Set<string>();
  const items: CheckoutItemInput[] = value.items.map((raw, index) => {
    const item = object(raw);
    if (Object.keys(item).some((key) => key !== 'productId' && key !== 'quantity')) {
      throw new AppError(400, 'UNEXPECTED_ITEM_FIELD', `Item ${index + 1} contém campos não permitidos.`);
    }
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    const quantity = item.quantity;
    if (!/^[A-Za-z0-9_-]{1,255}$/.test(productId)) {
      throw new AppError(400, 'INVALID_PRODUCT_ID', `Produto do item ${index + 1} inválido.`);
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new AppError(400, 'INVALID_QUANTITY', `Quantidade do item ${index + 1} deve ser um inteiro de 1 a 20.`);
    }
    if (seen.has(productId)) throw new AppError(400, 'DUPLICATE_PRODUCT', 'Produtos repetidos no carrinho não são permitidos.');
    seen.add(productId);
    return { productId, quantity };
  });

  const shippingAddressId = typeof value.shippingAddressId === 'string' ? value.shippingAddressId.trim() : '';
  const hasInlineAddress = value.shippingAddress !== undefined;
  if ((shippingAddressId && hasInlineAddress) || (!shippingAddressId && !hasInlineAddress)) {
    throw new AppError(400, 'INVALID_SHIPPING_SELECTION', 'Selecione um endereço salvo ou informe um endereço de entrega.');
  }
  if (shippingAddressId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shippingAddressId)) {
    throw new AppError(400, 'INVALID_ADDRESS_ID', 'Endereço selecionado inválido.');
  }
  return shippingAddressId
    ? { items, shippingAddressId }
    : { items, shippingAddress: parseShippingAddress(value.shippingAddress) };
}

export function parseIdempotencyKey(value: string | undefined) {
  if (!value || !/^[A-Za-z0-9:_-]{8,200}$/.test(value)) {
    throw new AppError(400, 'INVALID_IDEMPOTENCY_KEY', 'Envie um Idempotency-Key válido.');
  }
  return value;
}
