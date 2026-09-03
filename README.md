# Painel Financeiro

Painel pessoal de finanças com controle de lançamentos, categorias e visão mensal. Construído com Next.js e Supabase.

---

## Pré-requisitos

- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Vercel](https://vercel.com) (gratuita)
- Conta no [GitHub](https://github.com) (gratuita)

---

## Passo 1 — Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e clique em **Start your project**
2. Crie uma organização e um novo projeto (anote a senha do banco, você vai precisar)
3. Aguarde o projeto inicializar (leva cerca de 1 minuto)

---

## Passo 2 — Criar o banco de dados

1. No painel do Supabase, clique em **SQL Editor** no menu da esquerda
2. Clique em **New query**
3. Abra o arquivo `supabase/migrations/001_schema_inicial.sql` deste repositório
4. Copie todo o conteúdo e cole no editor
5. Clique em **Run**

Isso vai criar todas as tabelas, políticas de segurança e as categorias padrão.

---

## Passo 3 — Pegar as credenciais do Supabase

1. No painel do Supabase, vá em **Project Settings → API**
2. Copie os dois valores:
   - **Project URL** → algo como `https://xxxxxxxxxxx.supabase.co`
   - **anon public** (chave pública) → começa com `sb_publishable_...`

Guarde esses dois valores, você vai usá-los no próximo passo.

---

## Passo 4 — Fazer o deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em **Add New → Project**
3. Selecione este repositório na lista
4. Antes de clicar em Deploy, expanda a seção **Environment Variables** e adicione:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | A Project URL copiada no Passo 3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | A chave anon copiada no Passo 3 |

5. Clique em **Deploy**

Após alguns minutos, o Vercel vai gerar um link público (ex: `seu-painel.vercel.app`). Esse é o endereço do seu painel.

---

## Passo 5 — Criar sua conta no painel

1. Acesse o link gerado pelo Vercel
2. Clique em **Criar conta** e cadastre seu e-mail e senha
3. Pronto — seus dados ficam 100% no seu Supabase, isolados e privados

---

## Segurança e privacidade

- Cada usuário só vê os **próprios dados** (Row Level Security ativado no banco)
- As credenciais do Supabase ficam **apenas nas variáveis de ambiente do Vercel** — não estão no código
- O arquivo `.env.local` está no `.gitignore` e nunca é enviado ao GitHub
- Nenhuma terceira parte tem acesso ao seu banco de dados

---

## Rodando localmente (opcional)

Se quiser rodar o projeto na sua máquina:

1. Clone o repositório
2. Crie um arquivo `.env.local` na raiz com o conteúdo:

```
NEXT_PUBLIC_SUPABASE_URL=sua_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
```

3. Instale as dependências e rode:

```bash
npm install
npm run dev
```

4. Acesse [http://localhost:3000](http://localhost:3000)
5. esta
