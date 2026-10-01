import { describe, expect, it } from 'vitest';
import { parseAddressId, parseSavedAddress } from '../../src/modules/addresses/addresses.schemas';

const address = {
  label: 'Casa', recipient: 'Maria Silva', street: 'Rua das Flores', number: '10', complement: '',
  neighborhood: 'Centro', city: 'São Paulo', state: 'sp', postalCode: '01001-000', country: 'BR', isDefault: true,
};

describe('endereços salvos', () => {
  it('normaliza CEP e UF e preserva a escolha de principal', () => {
    expect(parseSavedAddress(address)).toEqual({ ...address, state: 'SP', postalCode: '01001000' });
  });

  it('rejeita campos inesperados e identificadores inválidos', () => {
    expect(() => parseSavedAddress({ ...address, userId: 'outro-usuario' })).toThrow(/campos não permitidos/);
    expect(() => parseAddressId('address_1')).toThrow(/inválido/);
  });

  it('aceita um UUID de endereço', () => {
    expect(parseAddressId('ca032c70-3ed6-486e-8c4c-055c79a1402a')).toBe('ca032c70-3ed6-486e-8c4c-055c79a1402a');
  });
});
