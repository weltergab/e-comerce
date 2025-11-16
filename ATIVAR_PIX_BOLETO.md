# Como Ativar PIX e Boleto no Stripe

## ✅ O que já foi feito no código

O código já está configurado para aceitar:
- 💳 **Cartão de Crédito/Débito**
- 🎫 **Boleto Bancário** (expira em 3 dias)
- 🔜 **PIX** (quando ativado no dashboard)

## 🔧 Configuração no Dashboard da Stripe

### 1. Acesse o Dashboard da Stripe
Vá para: https://dashboard.stripe.com

### 2. Ative os Métodos de Pagamento

#### Para Boleto:
1. No menu lateral, vá em **Settings** (Configurações)
2. Clique em **Payment methods** (Métodos de pagamento)
3. Procure por **Boleto** na lista
4. Clique em **Enable** (Ativar)
5. Confirme a ativação

#### Para PIX:
1. No menu lateral, vá em **Settings** (Configurações)
2. Clique em **Payment methods** (Métodos de pagamento)
3. Procure por **PIX** na lista
4. Clique em **Enable** (Ativar)
5. **IMPORTANTE:** PIX requer aprovação da Stripe
   - Preencha as informações da sua empresa
   - Aguarde aprovação (geralmente 1-2 dias úteis)

### 3. Configure sua Conta Bancária no Brasil

Para receber pagamentos de Boleto e PIX, você precisa:

1. Ir em **Settings** > **Bank accounts and scheduling**
2. Adicionar uma conta bancária brasileira
3. Verificar a conta (Stripe fará um depósito de teste)

## 📝 Informações Importantes

### Boleto:
- ✅ Já está ativado no código
- Expira em **3 dias úteis**
- Cliente recebe o PDF do boleto após finalizar
- Pagamento pode levar até 3 dias para confirmar
- **Taxa:** ~3.2% + R$2,00 por transação

### PIX:
- ⚠️ Precisa adicionar ao código após ativação no dashboard
- Pagamento **instantâneo**
- Cliente recebe QR Code para pagar
- Confirmação em segundos
- **Taxa:** ~3.2% por transação

## 🚀 Após Ativar no Dashboard

### Para adicionar PIX no código:

Quando PIX for aprovado no seu dashboard, me avise que eu atualizo o código para incluir PIX também!

Basta adicionar `'pix'` na lista de `payment_method_types`:

```typescript
payment_method_types: ['card', 'boleto', 'pix'],
```

## 🧪 Testando

### Modo de Teste (Test Mode):

**Boleto de Teste:**
- Use qualquer email válido
- O boleto será gerado mas não precisa pagar
- Para simular aprovação: vá no dashboard e aprove manualmente

**PIX de Teste:**
- Após ativar PIX, use qualquer email válido
- QR Code será gerado mas não precisa pagar
- Para simular aprovação: vá no dashboard e aprove manualmente

### Modo Produção (Live Mode):

1. Ative o **Live Mode** no dashboard
2. Complete todas as informações da empresa
3. Verifique sua conta bancária
4. Ative os métodos de pagamento em produção
5. Teste com transações reais pequenas primeiro

## ❓ Precisa de Ajuda?

- **Documentação Stripe Brasil:** https://stripe.com/docs/payments/payment-methods/integration-options
- **Suporte Stripe:** https://support.stripe.com
- **Documentação Boleto:** https://stripe.com/docs/payments/boleto
- **Documentação PIX:** https://stripe.com/docs/payments/pix

## 🎉 Resultado Final

Quando tudo estiver ativado, seus clientes verão automaticamente no checkout:

```
Métodos de Pagamento:
☑️ Cartão de Crédito/Débito
☑️ Boleto Bancário
☑️ PIX (após aprovação)
```

O Payment Element mostra automaticamente todos os métodos disponíveis!
