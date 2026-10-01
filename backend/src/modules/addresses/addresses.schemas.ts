import { AppError } from '../../shared/errors';
import { object, parseShippingAddress } from '../checkout/checkout.schemas';

export function parseAddressId(value: unknown) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError(400, 'INVALID_ADDRESS_ID', 'Endereço inválido.');
  }
  return id;
}

export function parseSavedAddress(body: unknown) {
  const value = object(body);
  const allowedKeys = new Set([
    'label', 'recipient', 'street', 'number', 'complement', 'neighborhood',
    'city', 'state', 'postalCode', 'country', 'isDefault',
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new AppError(400, 'UNEXPECTED_ADDRESS_FIELD', 'O endereço contém campos não permitidos.');
  }
  const label = typeof value.label === 'string' ? value.label.trim() : '';
  if (!label || label.length > 80) throw new AppError(400, 'INVALID_ADDRESS_LABEL', 'Informe um nome de até 80 caracteres para o endereço.');
  if (value.isDefault !== undefined && typeof value.isDefault !== 'boolean') {
    throw new AppError(400, 'INVALID_DEFAULT_ADDRESS', 'A indicação de endereço principal é inválida.');
  }
  const shipping = parseShippingAddress({
    recipient: value.recipient,
    street: value.street,
    number: value.number,
    complement: value.complement,
    neighborhood: value.neighborhood,
    city: value.city,
    state: value.state,
    postalCode: value.postalCode,
    country: value.country,
  });
  return {
    label,
    ...shipping,
    isDefault: value.isDefault === true,
  };
}
