-- supabase/migrations/001_emails_analisados.sql
-- Histórico das análises de email, isolado por usuário via RLS.

create table if not exists public.emails_analisados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  de text,
  para text,
  cc text,
  assunto text,
  data_email text,
  corpo text,
  para_mim boolean not null,
  confianca numeric,
  analise jsonb not null,
  criado_em timestamptz not null default now()
);

create index if not exists emails_analisados_user_idx
  on public.emails_analisados (user_id, criado_em desc);

alter table public.emails_analisados enable row level security;

create policy "usuario ve seus proprios emails"
  on public.emails_analisados for select
  using (auth.uid() = user_id);

create policy "usuario insere seus proprios emails"
  on public.emails_analisados for insert
  with check (auth.uid() = user_id);

create policy "usuario apaga seus proprios emails"
  on public.emails_analisados for delete
  using (auth.uid() = user_id);
