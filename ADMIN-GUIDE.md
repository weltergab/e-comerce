# Guia do Painel Administrativo

## Configuração Inicial

### 1. Configurar Banco de Dados

Execute o script SQL no Supabase:

```bash
# Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
# Cole e execute o conteúdo de: database/admin-setup.sql
```

**Importante:** Edite o script e substitua `'seu-email@example.com'` pelo email do usuário que será administrador.

### 2. Variáveis de Ambiente

Certifique-se de que estas variáveis estão configuradas no `.env.local`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# JWT
JWT_SECRET=sua-chave-secreta-segura
```

## Funcionalidades

### Painel Administrativo (`/admin`)

O painel administrativo permite gerenciar produtos do Stripe diretamente pelo site:

#### 1. **Criar Produtos**
- Nome do produto
- Descrição
- Preço (em R$)
- Quantidade em estoque
- URL da imagem

#### 2. **Editar Produtos**
- Atualizar qualquer informação do produto
- Alterar preço (cria novo price no Stripe)
- Atualizar estoque
- Modificar imagens

#### 3. **Excluir Produtos**
- Remove produto do catálogo (arquiva no Stripe)
- Confirmação antes de excluir

#### 4. **Visualizar Produtos**
- Lista todos os produtos ativos
- Mostra preço e estoque atual
- Imagens dos produtos

## APIs Administrativas

Todas as rotas abaixo requerem autenticação de administrador via header:
```
Authorization: Bearer <token>
```

### GET `/api/admin/products`
Lista todos os produtos do Stripe

**Resposta:**
```json
{
  "success": true,
  "products": [
    {
      "id": "prod_...",
      "name": "Nome do Produto",
      "description": "Descrição",
      "images": ["https://..."],
      "active": true,
      "metadata": {
        "stock": "10"
      },
      "price": {
        "id": "price_...",
        "unit_amount": 9990,
        "currency": "brl"
      }
    }
  ]
}
```

### POST `/api/admin/products`
Cria um novo produto

**Body:**
```json
{
  "name": "Nome do Produto",
  "description": "Descrição do produto",
  "price": 99.90,
  "stock": 10,
  "images": ["https://imagem.com/foto.jpg"]
}
```

### PUT `/api/admin/products/[id]`
Atualiza um produto existente

**Body:**
```json
{
  "name": "Novo Nome",
  "description": "Nova descrição",
  "price": 149.90,
  "stock": 5,
  "images": ["https://nova-imagem.com/foto.jpg"],
  "active": true
}
```

### DELETE `/api/admin/products/[id]`
Arquiva um produto (soft delete)

### GET `/api/admin/products/[id]`
Busca detalhes de um produto específico

## Fluxo de Uso

### Como Acessar o Painel Admin

1. Faça login com uma conta de administrador
2. Acesse `/admin` no navegador
3. Você verá a lista de produtos e poderá gerenciá-los

### Como Criar um Usuário Administrador

1. Execute o script SQL `database/admin-setup.sql` no Supabase
2. Atualize o email no script para o usuário desejado
3. O usuário precisará fazer logout e login novamente para obter o token atualizado

### Gerenciamento de Estoque

O estoque é armazenado nos `metadata` do produto no Stripe:
- Campo: `metadata.stock`
- Tipo: String (convertido para número)
- Atualizado via painel admin

## Segurança

### Proteção de Rotas
- Todas as APIs admin verificam o token JWT
- Apenas usuários com `isAdmin: true` têm acesso
- Middleware `authenticateAdmin` valida permissões

### Validações
- Nome e preço são obrigatórios
- Preço deve ser maior que zero
- Estoque deve ser número inteiro
- URLs de imagens são validadas

## Integração com Stripe

### Estrutura de Produtos
Cada produto no Stripe contém:
- **Product**: Informações do produto (nome, descrição, imagens)
- **Price**: Preço do produto (sempre em centavos)
- **Metadata**: Dados customizados (estoque)

### Atualização de Preços
Quando você atualiza o preço:
1. Um novo `Price` é criado no Stripe
2. O `Price` anterior é arquivado (`active: false`)
3. O novo `Price` se torna o `default_price` do produto

### Exclusão de Produtos
Produtos não são deletados, apenas arquivados:
- `active: false` no Stripe
- Não aparecem mais na listagem
- Podem ser reativados manualmente no Stripe Dashboard

## Troubleshooting

### Erro: "Acesso negado"
- Verifique se executou o SQL para definir is_admin
- Faça logout e login novamente
- Verifique o token no localStorage

### Produtos não aparecem
- Verifique se os produtos estão ativos no Stripe
- Confira as credenciais do Stripe no .env.local
- Veja o console do navegador para erros

### Erro ao criar produto
- Confirme que STRIPE_SECRET_KEY está correto
- Verifique se o preço é um número válido
- Veja logs do servidor para detalhes

## Exemplo de Fluxo Completo

```bash
# 1. Configurar banco de dados
# Execute database/admin-setup.sql no Supabase

# 2. Fazer login como admin
# Acesse /login e entre com credenciais de admin

# 3. Acessar painel
# Navegue para /admin

# 4. Criar produto
# Clique em "Novo Produto"
# Preencha os campos e salve

# 5. Produto aparece na loja
# Acesse / e veja o produto listado
```

## Melhorias Futuras

Possíveis funcionalidades a adicionar:
- Upload de imagens direto para CDN
- Gerenciamento de categorias
- Produtos em destaque
- Descontos e cupons
- Relatórios de vendas
- Gestão de pedidos
