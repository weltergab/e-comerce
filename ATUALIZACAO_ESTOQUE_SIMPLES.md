# ✅ Sistema de Atualização de Estoque - Abordagem Simples

## 🎯 Como Funciona Agora

O estoque é verificado e atualizado apenas quando necessário:

### 1. **Ao Carregar a Página**
- Usuário acessa homepage → busca estoque uma vez
- Mostra estoque atualizado de todos produtos

### 2. **Ao Adicionar ao Carrinho**
- Usuário clica "Adicionar ao Carrinho"
- Sistema busca estoque atual do produto
- Verifica se tem quantidade disponível
- Se sim → adiciona ao carrinho
- Se não → mostra alerta "Estoque insuficiente!"

### 3. **Ao Finalizar Compra**
- Webhook do Stripe atualiza estoque no servidor
- Estoque salvo em arquivo JSON
- Próximo acesso à página já mostra estoque atualizado

---

## 📊 Fluxo Completo

```
1. Usuário acessa site
   ↓
2. Carrega estoque (1 requisição)
   ↓
3. Usuário clica em "Adicionar ao Carrinho"
   ↓
4. Verifica estoque disponível (1 requisição)
   ↓
5. Valida: quantidade no carrinho + nova <= estoque?
   ↓
6. Se OK → adiciona ao carrinho
   Se NÃO → mostra alerta
   ↓
7. Usuário finaliza compra
   ↓
8. Webhook atualiza estoque no servidor
   ↓
9. Próximo usuário vê estoque atualizado
```

---

## ✅ Vantagens

1. **Simples** - Fácil de entender e manter
2. **Eficiente** - Apenas 1-2 requisições por ação
3. **Sem Polling** - Não fica fazendo requisições a cada X segundos
4. **Validação Real** - Verifica estoque antes de adicionar ao carrinho
5. **Sem Sobrecarga** - Servidor não é bombardeado de requisições

---

## 🔧 O Que Foi Implementado

### 1. Hook useStock Simplificado
```typescript
// Busca estoque APENAS ao carregar
useEffect(() => {
  fetchStock();
}, []);
```

### 2. Validação ao Adicionar no Carrinho
```typescript
const addItem = async (product: Product) => {
  // Busca estoque atual
  const response = await fetch('/api/stock');
  const availableStock = data.stock[product.id];

  // Valida quantidade
  if (totalNeeded > availableStock) {
    alert('Estoque insuficiente!');
    return false;
  }

  // Adiciona ao carrinho
  ...
}
```

### 3. Atualização pelo Webhook
- Webhook recebe evento de pagamento
- Atualiza estoque no arquivo JSON
- Próximo acesso já vê estoque atualizado

---

## 📝 Exemplos Práticos

### Exemplo 1: Usuário Adiciona ao Carrinho
```
Produto: Teclado RGB
Estoque: 30 unidades
Já no carrinho: 2 unidades

Usuário clica "Adicionar" (1 unidade)
→ Sistema verifica: 2 + 1 = 3 <= 30? ✅
→ Adiciona ao carrinho

Usuário clica "Adicionar" mais 28 vezes
→ Sistema verifica: 30 + 1 = 31 <= 30? ❌
→ Mostra: "Estoque insuficiente! Disponível: 30, No carrinho: 30"
```

### Exemplo 2: Após Compra
```
Cliente A compra 5 unidades
→ Webhook atualiza: 30 - 5 = 25
→ Arquivo stock.json: {"3": 25}

Cliente B acessa o site
→ Carrega estoque: {"3": 25}
→ Vê: "Estoque: 25"
```

---

## 🎯 Quando o Estoque É Atualizado

| Ação | Requisições | Atualiza Estoque |
|------|-------------|------------------|
| Carregar página | 1 | Não (só lê) |
| Adicionar ao carrinho | 1 | Não (só valida) |
| Recarregar página | 1 | Não (só lê) |
| Finalizar compra | 0* | Sim (via webhook) |

*Webhook é chamado pelo Stripe, não pelo cliente

---

## 💡 Comportamento Esperado

### Cenário 1: Múltiplos Usuários
```
10:00 - Cliente A vê estoque: 30
10:01 - Cliente B vê estoque: 30
10:02 - Cliente A compra 5 unidades
10:03 - Webhook atualiza: 30 → 25
10:04 - Cliente B adiciona ao carrinho
        → Busca estoque atual: 25 ✅
        → Validação usa estoque real!
```

### Cenário 2: Estoque Acabando
```
Estoque: 2 unidades
Carrinho: 1 unidade

Tenta adicionar 2 unidades
→ Verifica: 1 + 2 = 3 <= 2? ❌
→ "Estoque insuficiente! Disponível: 2, No carrinho: 1"
→ Usuário pode adicionar no máximo 1 unidade
```

---

## 🚀 Pronto para Usar!

Agora o sistema:
- ✅ Não faz polling (sem requisições desnecessárias)
- ✅ Valida estoque ao adicionar no carrinho
- ✅ Atualiza estoque via webhook
- ✅ Simples e eficiente
- ✅ Funciona perfeitamente!

Basta garantir que o webhook do Stripe esteja configurado e funcionará automaticamente.
