# Configuração de Autenticação com Supabase

Este guia explica como configurar a autenticação JWT com Supabase no projeto.

## 1. Criar conta no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Crie uma conta gratuita
3. Crie um novo projeto

## 2. Configurar o Banco de Dados

1. No painel do Supabase, vá em **SQL Editor**
2. Execute o SQL encontrado em `lib/supabase/setup-database.sql`
   - Este SQL cria a tabela de usuários
   - Configura índices para performance
   - Habilita Row Level Security (RLS)

## 3. Obter as Credenciais do Supabase

1. No painel do Supabase, vá em **Settings** > **API**
2. Copie:
   - **Project URL** (URL do projeto)
   - **anon/public key** (chave anônima/pública)

## 4. Configurar Variáveis de Ambiente

Abra o arquivo `.env.local` e preencha as seguintes variáveis:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_aqui

# JWT Secret (gere uma string aleatória segura)
JWT_SECRET=sua_chave_jwt_secreta_aqui
```

### Gerar JWT Secret

Para gerar uma chave JWT segura, você pode usar:

**No terminal do Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Ou online:**
- Use um gerador de strings aleatórias seguras
- Recomendado: pelo menos 32 caracteres

## 5. Testar a Aplicação

1. Instale as dependências (já feito):
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse `http://localhost:3000`

## Fluxo de Autenticação

### Como Funciona

1. **Navegação livre**: Usuários podem navegar e adicionar produtos ao carrinho sem login
2. **Checkout protegido**: Ao clicar em "Finalizar Compra", se não estiver logado:
   - Um modal de login/cadastro aparece
   - O usuário deve fazer login ou criar uma conta
3. **Após autenticação**: O formulário de pagamento é liberado

### Cadastro

- **Email**: Deve ser válido
- **Username**:
  - Apenas letras e números (sem espaços ou acentos)
  - Mínimo 3 caracteres, máximo 50
  - Único no sistema
- **Senha**: Mínimo 6 caracteres

### Login

- O usuário pode fazer login com:
  - **Email** OU
  - **Username**
- Mais a senha

## Segurança

- As senhas são criptografadas com bcrypt (10 rounds)
- JWT com expiração de 7 dias
- API de pagamento protegida (requer autenticação)
- Row Level Security habilitado no Supabase

## Estrutura dos Arquivos

```
lib/
├── auth/
│   ├── jwt.ts              # Funções de JWT (sign/verify)
│   └── middleware.ts       # Middleware de autenticação
├── supabase/
│   ├── client.ts           # Cliente Supabase
│   └── setup-database.sql  # SQL para criar tabelas

app/api/auth/
├── login/route.ts          # API de login
├── register/route.ts       # API de cadastro
└── me/route.ts            # API para obter usuário atual

contexts/
└── AuthContext.tsx        # Context React para autenticação

components/auth/
└── AuthModal.tsx          # Modal de login/cadastro
```

## Troubleshooting

### Erro: "Não autenticado" ao tentar pagar

- Verifique se as variáveis de ambiente estão configuradas corretamente
- Certifique-se de que o JWT_SECRET está definido
- Limpe o localStorage e faça login novamente

### Erro ao criar usuário

- Verifique se executou o SQL no Supabase
- Confirme que a tabela `users` foi criada
- Verifique as credenciais do Supabase no `.env.local`

### Token expirado

- Tokens JWT expiram em 7 dias
- O usuário precisa fazer login novamente
- O sistema detecta automaticamente e solicita novo login
