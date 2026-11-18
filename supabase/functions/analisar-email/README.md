# analisar-email

Edge Function do Supabase que faz a triagem de email com o Gemini.

## Publicar

```bash
supabase secrets set GEMINI_API_KEY=sua_chave_aqui
supabase functions deploy analisar-email
```

## Testar

POST para `https://<projeto>.supabase.co/functions/v1/analisar-email` com:
- Header `Authorization: Bearer <token do usuário logado>`
- Body:

```json
{
  "usuario": { "nome": "Guilherme", "email": "seu@email.com" },
  "email": {
    "de": "chefe@empresa.com",
    "para": "seu@email.com",
    "cc": "",
    "assunto": "Relatório de Outubro",
    "data": "2026-11-17",
    "corpo": "Guilherme, preciso do relatório até sexta. Pode me enviar?"
  }
}
```
