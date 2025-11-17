# Correções de Preços - Sistema Admin

## Problemas Identificados e Corrigidos

### 1. Preços aparecendo como R$ 0,00 no painel admin

**Causa:** O Stripe às vezes retorna `default_price` como string (ID) em vez de objeto expandido, mesmo usando `expand: ['data.default_price']`.

**Solução:** Implementado fallback para buscar o preço manualmente quando vier como string:

```typescript
// Antes (não funcionava sempre)
const defaultPrice = product.default_price as Stripe.Price | null;

// Depois (funciona sempre)
if (typeof defaultPrice === 'string') {
  const price = await stripe.prices.retrieve(defaultPrice);
  priceData = { id: price.id, unit_amount: price.unit_amount, ... };
} else {
  priceData = { id: defaultPrice.id, ... };
}
```

**Arquivos alterados:**
- `app/api/admin/products/route.ts` (GET)
- `app/api/admin/products/[id]/route.ts` (GET e PUT)

---

### 2. Edição de preço criava duplicatas no Stripe

**Causa:** Sempre criávamos um novo `Price` no Stripe ao editar, mesmo se o preço não mudasse.

**Solução:** Verificar se o preço realmente mudou antes de criar um novo:

```typescript
// Buscar preço atual
const currentPrice = await stripe.prices.retrieve(currentPriceId);
const currentAmount = currentPrice.unit_amount || 0;
const newAmount = Math.round(price * 100);

// Só criar novo se mudou
if (currentAmount !== newAmount) {
  // Criar novo price e arquivar o antigo
}
```

**Arquivo alterado:**
- `app/api/admin/products/[id]/route.ts` (PUT)

**Comportamento:**
- ✅ Se o preço não mudou: não cria novo Price
- ✅ Se o preço mudou: cria novo Price e arquiva o antigo (`active: false`)
- ✅ Novo Price se torna `default_price` automaticamente

---

### 3. Site mostrando preços antigos/diferentes do painel

**Causa:** O site estava usando produtos mockados (hardcoded) do arquivo `lib/data/products.ts`, não buscava do Stripe.

**Solução:** Criada API pública para buscar produtos do Stripe e atualizado componente para usar a API:

**Nova API criada:**
```
GET /api/products
```
Retorna todos os produtos ativos do Stripe com preços atualizados.

**Componente atualizado:**
- `components/product/ProductGrid.tsx` - Agora busca produtos via `fetch('/api/products')`

**Arquivos alterados:**
- `app/api/products/route.ts` (NOVO)
- `components/product/ProductGrid.tsx`

---

## Como Funciona Agora

### Fluxo de Criação de Produto

1. Admin cria produto no painel (`/admin`)
2. API cria Product no Stripe
3. API cria Price no Stripe
4. Price é definido como `default_price`
5. Produto aparece imediatamente no site

### Fluxo de Edição de Produto

#### Editando apenas nome/descrição/imagens/estoque:
1. Admin edita no painel
2. API atualiza apenas os campos do Product
3. **Price não é alterado** (evita duplicatas)
4. Mudanças aparecem no site

#### Editando o preço:
1. Admin edita preço no painel
2. API compara preço novo com atual
3. **Se diferente:**
   - Cria novo Price no Stripe
   - Define novo Price como default
   - Arquiva Price antigo
4. **Se igual:**
   - Não faz nada (evita duplicata)
5. Mudanças aparecem no site

### Fluxo de Exibição no Site

1. Usuário acessa página principal (`/`)
2. Componente busca produtos via `/api/products`
3. API busca produtos ativos do Stripe
4. API busca preços (com fallback manual se necessário)
5. Produtos são exibidos com **preços atualizados**

---

## Vantagens das Correções

### ✅ Preços Sempre Corretos
- Painel admin mostra preços reais do Stripe
- Site mostra preços reais do Stripe
- Sincronização automática

### ✅ Sem Duplicatas no Stripe
- Editar outros campos não cria novo Price
- Novo Price só quando preço realmente muda
- Prices antigos são arquivados (não deletados)

### ✅ Histórico Preservado
- Prices antigos ficam arquivados
- Pode ver histórico no Stripe Dashboard
- Pedidos antigos mantêm referência ao Price correto

### ✅ Performance
- Busca de preços otimizada
- Cache pode ser adicionado facilmente
- Fallback manual só quando necessário

---

## Testando as Correções

### 1. Testar Painel Admin

```bash
# Acessar
http://localhost:3000/admin

# Verificar
- [ ] Preços aparecem corretamente
- [ ] Editar nome não cria novo Price
- [ ] Editar preço cria novo Price
- [ ] Editar com mesmo preço não cria duplicata
```

### 2. Testar Site

```bash
# Acessar
http://localhost:3000/

# Verificar
- [ ] Produtos do Stripe aparecem
- [ ] Preços estão corretos
- [ ] Mudanças no admin refletem no site (após reload)
```

### 3. Verificar no Stripe Dashboard

```bash
# Acessar: https://dashboard.stripe.com/products

# Verificar
- [ ] Produto tem apenas 1 Price ativo
- [ ] Prices antigos estão arquivados (inactive)
- [ ] default_price está correto
```

---

## Comandos Úteis

### Ver produtos e preços via API

```bash
# Listar produtos (público)
curl http://localhost:3000/api/products

# Listar produtos (admin) - Substitua TOKEN
curl http://localhost:3000/api/admin/products \
  -H "Authorization: Bearer TOKEN"

# Ver produto específico (admin)
curl http://localhost:3000/api/admin/products/PRODUCT_ID \
  -H "Authorization: Bearer TOKEN"
```

### Atualizar preço via API

```bash
# Editar preço (admin)
curl -X PUT http://localhost:3000/api/admin/products/PRODUCT_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 199.90
  }'
```

---

## Estrutura de Dados

### Produto no Stripe
```typescript
{
  id: "prod_xxx",
  name: "Nome do Produto",
  description: "Descrição",
  images: ["https://..."],
  active: true,
  default_price: "price_xxx" | Price, // Pode ser string ou objeto
  metadata: {
    stock: "10",
    category: "Eletrônicos"
  }
}
```

### Price no Stripe
```typescript
{
  id: "price_xxx",
  product: "prod_xxx",
  unit_amount: 9990, // Em centavos (R$ 99.90)
  currency: "brl",
  active: true
}
```

### Produto retornado pela API
```typescript
{
  id: "prod_xxx",
  name: "Nome do Produto",
  description: "Descrição",
  price: 99.90, // Em reais
  image: "https://...",
  category: "Eletrônicos",
  stock: 10,
  stripePriceId: "price_xxx"
}
```

---

## Próximos Passos (Melhorias Futuras)

- [ ] Cache de produtos no frontend (React Query ou SWR)
- [ ] Revalidação automática ao criar/editar produtos
- [ ] Webhook para sincronização em tempo real
- [ ] Suporte a múltiplas moedas
- [ ] Histórico de mudanças de preço
- [ ] Promoções e descontos temporários
