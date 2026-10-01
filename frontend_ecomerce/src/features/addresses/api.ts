import { apiJson } from '@/lib/api/client';
import type { SavedAddress, SavedAddressInput } from '@/types';

export function getAddresses() {
  return apiJson<{ addresses: SavedAddress[] }>('/api/account/addresses');
}

export function createAddress(input: SavedAddressInput) {
  return apiJson<{ address: SavedAddress }>('/api/account/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateAddress(addressId: string, input: SavedAddressInput) {
  return apiJson<{ address: SavedAddress }>(`/api/account/addresses/${encodeURIComponent(addressId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function deleteAddress(addressId: string) {
  return apiJson<void>(`/api/account/addresses/${encodeURIComponent(addressId)}`, { method: 'DELETE' });
}
