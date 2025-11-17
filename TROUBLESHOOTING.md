# Troubleshooting - Painel Admin

## Problema: "GET /api/auth/me 401 (Unauthorized)"

### Causa
O token JWT não está sendo enviado corretamente ou não existe no localStorage.

### Soluções

#### 1. Verificar se está logado
```javascript
// Abra o Console do navegador (F12) e execute:
localStorage.getItem('auth_token')
```
- Se retornar `null`, você precisa fazer login
- Se retornar um token, vá para a solução 2

#### 2. Fazer login novamente
1. Acesse `/login`
2. Faça login com suas credenciais
3. Tente acessar `/admin` novamente

#### 3. Verificar se o usuário é admin no banco
Execute no Supabase SQL Editor:
```sql
SELECT email, username, is_admin FROM users WHERE email = 'SEU-EMAIL@example.com';
```

Se `is_admin` for `false` ou `null`, execute:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'SEU-EMAIL@example.com';
```

#### 4. Fazer logout e login completo
```javascript
// No console do navegador:
localStorage.clear();
// Depois faça login novamente
```

#### 5. Verificar se o token tem isAdmin
```javascript
// No console do navegador, após login:
const token = localStorage.getItem('auth_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);
// Deve mostrar: { userId: "...", email: "...", username: "...", isAdmin: true }
```

Se `isAdmin` não estiver presente ou for `false`:
- Execute o SQL do passo 3
- Faça logout completo (localStorage.clear())
- Faça login novamente

## Problema: Botão "Admin" não aparece no header

### Causa
O usuário não tem `isAdmin: true` no token JWT.

### Solução
1. Execute o SQL para definir is_admin:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'SEU-EMAIL@example.com';
```

2. Limpe o localStorage e faça login novamente:
```javascript
localStorage.clear();
```

3. Faça login em `/login`

4. Verifique se o botão apareceu

## Problema: "Acesso negado. Apenas administradores."

### Causa
O token não contém `isAdmin: true` ou o usuário não é admin no banco.

### Solução
Siga os passos do problema 1 acima.

## Problema: Produtos não carregam

### Causa
Erro na API do Stripe ou credenciais inválidas.

### Solução

#### 1. Verificar variáveis de ambiente
Confira se `.env.local` tem:
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### 2. Verificar no console do navegador
Abra o Console (F12) e veja se há erros como:
- "No API key provided"
- "Invalid API key"
- "Network error"

#### 3. Testar API manualmente
```javascript
// No console do navegador:
const token = localStorage.getItem('auth_token');
fetch('/api/admin/products', {
  headers: { Authorization: `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log)
```

## Problema: Erro ao criar/editar produto

### Possíveis causas e soluções

#### 1. Preço inválido
- Certifique-se de usar número com ponto (ex: `99.90` não `99,90`)

#### 2. Estoque inválido
- Use apenas números inteiros (ex: `10` não `10.5`)

#### 3. URL da imagem inválida
- Use URL completa (ex: `https://example.com/image.jpg`)
- Ou deixe vazio se não tiver imagem

#### 4. Stripe retorna erro
Veja o console do servidor (terminal) para detalhes do erro do Stripe.

## Comandos Úteis

### Verificar token
```javascript
const token = localStorage.getItem('auth_token');
console.log('Token:', token);
console.log('Payload:', JSON.parse(atob(token.split('.')[1])));
```

### Limpar tudo e recomeçar
```javascript
localStorage.clear();
// Depois faça login novamente
```

### Verificar se API está respondendo
```javascript
fetch('/api/auth/me', {
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

## Checklist de Debug

- [ ] Executou o SQL para adicionar `is_admin` na tabela users?
- [ ] Executou o SQL para definir seu usuário como admin?
- [ ] Fez logout e login novamente após executar os SQLs?
- [ ] O token existe no localStorage? (`localStorage.getItem('auth_token')`)
- [ ] O token tem `isAdmin: true`?
- [ ] As variáveis de ambiente do Stripe estão corretas?
- [ ] O servidor está rodando? (`npm run dev`)
- [ ] Verificou o console do navegador para erros?
- [ ] Verificou o terminal para erros do servidor?

## Ainda com problemas?

1. Reinicie o servidor de desenvolvimento:
```bash
# Ctrl+C para parar
npm run dev
```

2. Limpe o cache do navegador:
- Ctrl+Shift+Delete
- Limpar cache e cookies
- Recarregar a página

3. Use modo anônimo/privado do navegador para testar

4. Verifique os logs do servidor no terminal
