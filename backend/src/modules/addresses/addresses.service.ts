import { db } from '../../db/client';
import { AppError } from '../../shared/errors';
import type { ShippingAddressInput } from '../checkout/checkout.schemas';

interface SavedAddressInput extends ShippingAddressInput {
  label: string;
  isDefault: boolean;
}

function formatAddress(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    label: String(row.label),
    recipient: String(row.recipient),
    street: String(row.street),
    number: String(row.number),
    complement: String(row.complement || ''),
    neighborhood: String(row.neighborhood),
    city: String(row.city),
    state: String(row.state),
    postalCode: String(row.postal_code),
    country: 'BR' as const,
    isDefault: Boolean(row.is_default),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const addressColumns = 'id,label,recipient,street,number,complement,neighborhood,city,state,postal_code,country,is_default,created_at,updated_at';

export async function listAddresses(userId: string) {
  const { data, error } = await db().from('user_addresses')
    .select(addressColumns)
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw new AppError(500, 'ADDRESSES_READ_FAILED', 'Não foi possível consultar seus endereços.');
  return (data || []).map((row) => formatAddress(row));
}

export async function getAddressForCheckout(userId: string, addressId: string) {
  const { data, error } = await db().from('user_addresses')
    .select(addressColumns)
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError(500, 'ADDRESS_READ_FAILED', 'Não foi possível consultar o endereço selecionado.');
  if (!data) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'O endereço selecionado não pertence à sua conta.');
  const address = formatAddress(data);
  return {
    recipient: address.recipient,
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  } satisfies ShippingAddressInput;
}

async function readAddress(userId: string, addressId: string) {
  const { data, error } = await db().from('user_addresses')
    .select(addressColumns)
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError(500, 'ADDRESS_READ_FAILED', 'Não foi possível consultar o endereço.');
  if (!data) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Endereço não encontrado.');
  return formatAddress(data);
}

export async function saveAddress(userId: string, addressId: string | null, input: SavedAddressInput) {
  const { data, error } = await db().rpc('save_user_address', {
    p_user_id: userId,
    p_address_id: addressId,
    p_label: input.label,
    p_recipient: input.recipient,
    p_street: input.street,
    p_number: input.number,
    p_complement: input.complement,
    p_neighborhood: input.neighborhood,
    p_city: input.city,
    p_state: input.state,
    p_postal_code: input.postalCode,
    p_country: input.country,
    p_is_default: input.isDefault,
  });
  if (error?.message.includes('ADDRESS_NOT_FOUND')) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Endereço não encontrado.');
  if (error || typeof data !== 'string') throw new AppError(500, 'ADDRESS_SAVE_FAILED', 'Não foi possível salvar o endereço.');
  return readAddress(userId, data);
}

export async function deleteAddress(userId: string, addressId: string) {
  const { data, error } = await db().rpc('delete_user_address', { p_user_id: userId, p_address_id: addressId });
  if (error) throw new AppError(500, 'ADDRESS_DELETE_FAILED', 'Não foi possível excluir o endereço.');
  if (data !== true) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Endereço não encontrado.');
}
