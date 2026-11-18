# analisar-email

Triagem de emails com IA (Gemini gratuito). Cole o email, o sistema analisa se é direcionado a você, resume, aponta pontos de atenção e sugere a resposta.

## Stack
- Front: React + Vite
- Backend: Supabase (Auth, Postgres com RLS, Edge Functions)
- IA: Gemini API (gemini-2.5-flash)

## Configuração

1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env` e preencha com os dados do projeto Supabase.
3. No Supabase, rode `supabase/migrations/001_emails_analisados.sql` no SQL Editor.
4. Crie seu usuário em Authentication → Users.
5. Publique a função:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase secrets set GEMINI_API_KEY=sua_chave
npx supabase functions deploy analisar-email
```

6. Rode o app: `npm run dev`

## Segurança
- A chave do Gemini fica só no servidor (secret do Supabase).
- O `.env` não vai para o Git.
- O RLS garante que cada usuário vê apenas os próprios registros.
