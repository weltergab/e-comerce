import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';
import { ApiError, apiJson } from '@/lib/api/client';
import { createAddress, getAddresses, updateAddress } from '@/src/features/addresses/api';
import { isHostedStripeCheckoutUrl, newCheckoutAttemptKey } from '@/src/features/checkout/attempt';
import type { CheckoutResponse, SavedAddress, SavedAddressInput } from '@/types';

const emptyAddress: SavedAddressInput = {
  label: 'Casa', recipient: '', street: '', number: '', complement: '', neighborhood: '',
  city: '', state: '', postalCode: '', country: 'BR', isDefault: true,
};
const resettableCheckoutErrors = new Set(['CHECKOUT_ALREADY_COMPLETED', 'CHECKOUT_EXPIRED', 'IDEMPOTENCY_KEY_REUSED']);

function addressDraft(address: SavedAddress): SavedAddressInput {
  return {
    label: address.label, recipient: address.recipient, street: address.street, number: address.number,
    complement: address.complement, neighborhood: address.neighborhood, city: address.city,
    state: address.state, postalCode: address.postalCode, country: 'BR', isDefault: address.isDefault,
  };
}

function addressSummary(address: SavedAddress) {
  return `${address.street}, ${address.number}${address.complement ? `, ${address.complement}` : ''} — ${address.neighborhood}, ${address.city}/${address.state} — CEP ${address.postalCode}`;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { items, total, isLoading: cartLoading } = useCart();
  const addressesQuery = useQuery({ queryKey: ['account', 'addresses'], queryFn: getAddresses });
  const addresses = useMemo(() => addressesQuery.data?.addresses || [], [addressesQuery.data]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [editorMode, setEditorMode] = useState<'new' | string | null>(null);
  const [draft, setDraft] = useState<SavedAddressInput>(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const attemptKey = useRef(newCheckoutAttemptKey());
  const submitting = useRef(false);
  const cartSignature = useMemo(() => items.map((item) => `${item.product.id}:${item.quantity}`).sort().join('|'), [items]);

  useEffect(() => {
    if (!addressesQuery.data) return;
    if (!addresses.length) {
      if (!editorMode) {
        setDraft(emptyAddress);
        setEditorMode('new');
      }
      return;
    }
    if (!addresses.some((address) => address.id === selectedAddressId)) {
      setSelectedAddressId((addresses.find((address) => address.isDefault) || addresses[0]).id);
    }
  }, [addresses, addressesQuery.data, editorMode, selectedAddressId]);

  useEffect(() => {
    attemptKey.current = newCheckoutAttemptKey();
  }, [cartSignature, selectedAddressId]);

  const openNewAddress = () => {
    setDraft({ ...emptyAddress, isDefault: addresses.length === 0 });
    setAddressError('');
    setError('');
    setEditorMode('new');
  };

  const openAddressEditor = (address: SavedAddress) => {
    setDraft(addressDraft(address));
    setAddressError('');
    setError('');
    setEditorMode(address.id);
  };

  const saveCurrentAddress = async () => {
    const required = [draft.label, draft.recipient, draft.street, draft.number, draft.neighborhood, draft.city, draft.state, draft.postalCode];
    if (required.some((value) => !value.trim())) {
      setAddressError('Preencha todos os campos obrigatórios do endereço.');
      return;
    }
    setSavingAddress(true);
    setAddressError('');
    try {
      const result = editorMode === 'new'
        ? await createAddress(draft)
        : await updateAddress(editorMode!, draft);
      queryClient.setQueryData<{ addresses: SavedAddress[] }>(['account', 'addresses'], (current) => {
        const others = (current?.addresses || [])
          .filter((address) => address.id !== result.address.id)
          .map((address) => result.address.isDefault ? { ...address, isDefault: false } : address);
        return { addresses: result.address.isDefault ? [result.address, ...others] : [...others, result.address] };
      });
      setSelectedAddressId(result.address.id);
      setEditorMode(null);
      void queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
    } catch (cause) {
      setAddressError(cause instanceof Error ? cause.message : 'Não foi possível salvar o endereço.');
    } finally {
      setSavingAddress(false);
    }
  };

  const startCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (editorMode || savingAddress) {
      setError('Salve ou cancele a edição do endereço antes de continuar.');
      return;
    }
    if (!selectedAddressId) {
      setError('Selecione ou cadastre um endereço de entrega.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      const requestCheckout = (key: string) => apiJson<CheckoutResponse>('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          shippingAddressId: selectedAddressId,
        }),
      });

      let key = attemptKey.current;
      let result: CheckoutResponse;
      try {
        result = await requestCheckout(key);
        if (!isHostedStripeCheckoutUrl(result.checkoutUrl)) {
          throw new ApiError(409, { code: 'CHECKOUT_ALREADY_COMPLETED', message: 'A tentativa anterior já foi encerrada.' });
        }
      } catch (cause) {
        if (!(cause instanceof ApiError) || !cause.body.code || !resettableCheckoutErrors.has(cause.body.code)) throw cause;
        key = newCheckoutAttemptKey();
        attemptKey.current = key;
        result = await requestCheckout(key);
        if (!isHostedStripeCheckoutUrl(result.checkoutUrl)) throw new Error('O servidor não retornou uma página de pagamento válida.');
      }
      sessionStorage.setItem(`checkout_order_items:${result.orderId}`, JSON.stringify(items.map((item) => ({ productId: item.product.id, quantity: item.quantity }))));
      // A resposta encerra esta tentativa. Voltar do Stripe deve iniciar outro pedido,
      // mesmo quando o carrinho e o endereço continuarem idênticos.
      attemptKey.current = newCheckoutAttemptKey();
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar o pagamento.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  if (cartLoading) return <div className="max-w-7xl mx-auto px-4 py-24" role="status">Carregando carrinho...</div>;
  if (!items.length) return <div className="max-w-3xl mx-auto px-4 py-24"><Card><CardContent className="text-center py-12"><h2 className="text-2xl font-bold mb-4">Carrinho vazio</h2><Button onClick={() => navigate('/')}>Ir para produtos</Button></CardContent></Card></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      <h1 className="text-3xl font-bold mb-8">Finalizar compra</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card><CardContent className="p-6">
            <form onSubmit={startCheckout} className="space-y-6">
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div><h2 className="text-xl font-bold">Endereço de entrega</h2><p className="text-sm text-gray-600 mt-1">O endereço selecionado ficará congelado neste pedido.</p></div>
                  <Button type="button" variant="outline" size="sm" onClick={openNewAddress}>Novo endereço</Button>
                </div>

                {addressesQuery.isLoading ? <p role="status">Carregando endereços...</p>
                  : addressesQuery.isError ? <p role="alert" className="text-red-700">Não foi possível carregar seus endereços. <button type="button" className="underline" onClick={() => addressesQuery.refetch()}>Tentar novamente</button></p>
                    : addresses.length > 0 && <div className="space-y-3">{addresses.map((address) => (
                      <div key={address.id} className="flex gap-3 rounded-xl border p-4" style={{ borderColor: selectedAddressId === address.id ? 'var(--color-primary)' : 'var(--color-borderLight)' }}>
                        <input type="radio" name="shipping-address" value={address.id} checked={selectedAddressId === address.id} onChange={() => setSelectedAddressId(address.id)} aria-label={`Usar endereço ${address.label}`} />
                        <div className="flex-1"><p className="font-bold">{address.label}{address.isDefault ? ' · Principal' : ''}</p><p className="text-sm mt-1">{address.recipient}</p><p className="text-sm text-gray-600">{addressSummary(address)}</p></div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => openAddressEditor(address)}>Editar</Button>
                      </div>
                    ))}</div>}

                {editorMode && <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--color-borderLight)' }}>
                  <h3 className="font-bold">{editorMode === 'new' ? 'Cadastrar endereço' : 'Editar endereço'}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {([
                      ['label', 'Nome do endereço'], ['recipient', 'Destinatário'], ['postalCode', 'CEP'], ['street', 'Rua'],
                      ['number', 'Número'], ['complement', 'Complemento (opcional)'], ['neighborhood', 'Bairro'], ['city', 'Cidade'], ['state', 'UF'],
                    ] as const).map(([name, label]) => (
                      <label key={name} className={name === 'recipient' || name === 'street' ? 'sm:col-span-2' : ''}>
                        <span className="block text-sm font-medium mb-1">{label}</span>
                        <input className="w-full border rounded-lg px-3 py-2" value={draft[name]} maxLength={name === 'number' ? 40 : name === 'label' ? 80 : 160}
                          onChange={(event) => setDraft((value) => ({ ...value, [name]: name === 'state' ? event.target.value.toUpperCase().slice(0, 2) : event.target.value }))} />
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft((value) => ({ ...value, isDefault: event.target.checked }))} />Usar como endereço principal</label>
                  {addressError && <p role="alert" className="text-red-700">{addressError}</p>}
                  <div className="flex gap-3"><Button type="button" onClick={saveCurrentAddress} disabled={savingAddress}>{savingAddress ? 'Salvando...' : 'Salvar endereço'}</Button>{addresses.length > 0 && <Button type="button" variant="ghost" onClick={() => setEditorMode(null)}>Cancelar</Button>}</div>
                </div>}
              </section>

              {searchParams.get('canceled') === '1' && !error && <p role="status" className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg">O pagamento anterior não foi concluído. Ao continuar, será criado um novo pedido.</p>}
              {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg">{error}</p>}
              <Button type="submit" fullWidth size="lg" disabled={loading || savingAddress || Boolean(editorMode) || !selectedAddressId}>{loading ? 'Redirecionando para o pagamento...' : 'Continuar para pagamento seguro'}</Button>
            </form>
          </CardContent></Card>
        </div>
        <div><Card className="sticky top-20"><CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Resumo do pedido</h2>
          <div className="space-y-4 mb-6">{items.map((item) => <div key={item.product.id} className="flex justify-between gap-3 text-sm"><span>{item.quantity}× {item.product.name}</span><strong>{formatCurrency(item.product.price * item.quantity, item.product.currency)}</strong></div>)}</div>
          <div className="border-t pt-4 flex justify-between text-lg font-bold"><span>Total</span><span>{formatCurrency(total, items[0]?.product.currency)}</span></div>
          <p className="text-sm text-green-700 mt-2">Frete grátis</p>
          <Button onClick={() => navigate('/cart')} variant="outline" fullWidth className="mt-4">Voltar ao carrinho</Button>
        </CardContent></Card></div>
      </div>
    </div>
  );
}
