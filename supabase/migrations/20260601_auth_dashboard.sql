-- ============================================================
-- 20260601_auth_dashboard.sql
-- Autenticação do dashboard: perfis de usuário + RLS (ADITIVO)
--
-- Owner inicial (UUID criado no Authentication > Users):
--   aa2a02aa-2130-4901-9c47-d2fa1d577be8
--
-- IMPORTANTE:
--  - Não altera NENHUM dado existente. Só cria a tabela de perfis,
--    liga RLS e cria policies.
--  - O chatbot usa SUPABASE_SERVICE_ROLE_KEY, que IGNORA RLS por
--    completo -> o chatbot continua funcionando igual.
--  - Regra de acesso (modelo "interno/staff"):
--      * anon (não logado) -> não lê NADA.
--      * authenticated (logado) -> lê e escreve tudo no dashboard.
--    Controle fino (só owner cria/remove usuários) é feito no painel
--    admin via service_role, não aqui.
--  - Idempotente: pode rodar de novo sem quebrar.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabela de perfis da plataforma (quem pode entrar no dashboard)
-- ------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  role         text not null default 'engenheiro' check (role in ('owner', 'engenheiro')),
  status       text not null default 'active'     check (status in ('active', 'inactive')),
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. Marca o usuário owner inicial
-- ------------------------------------------------------------
insert into public.user_profiles (user_id, email, display_name, role, status, created_by)
select id, email, split_part(email, '@', 1), 'owner', 'active', id
from auth.users
where id = 'aa2a02aa-2130-4901-9c47-d2fa1d577be8'
on conflict (user_id) do update
  set role = 'owner', status = 'active', updated_at = now();

-- ------------------------------------------------------------
-- 3. RLS da própria tabela de perfis
--    - cada usuário lê só o PRÓPRIO perfil (pra o front saber se é owner)
--    - escrita só via service_role (painel admin) -> sem policy de
--      insert/update/delete para authenticated (evita auto-promoção a owner)
-- ------------------------------------------------------------
alter table public.user_profiles enable row level security;

drop policy if exists "profiles_select_own" on public.user_profiles;
create policy "profiles_select_own"
  on public.user_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4. Liga RLS em todas as outras tabelas do schema public
--    Política única: authenticated tem acesso total; anon nada.
-- ------------------------------------------------------------
do $$
declare
  r record;
  pol_name text;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename <> 'user_profiles'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);

    pol_name := left('auth_all_' || r.tablename, 63);
    execute format('drop policy if exists %I on public.%I;', pol_name, r.tablename);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true);',
      pol_name, r.tablename
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 5. Views (vw_*): bloqueia anon e garante authenticated.
--    Também tenta security_invoker (PG15+) para respeitar a RLS
--    das tabelas base; se a versão não suportar, ignora sem quebrar.
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select table_name from information_schema.views where table_schema = 'public'
  loop
    execute format('revoke select on public.%I from anon;', r.table_name);
    execute format('grant select on public.%I to authenticated;', r.table_name);
    begin
      execute format('alter view public.%I set (security_invoker = on);', r.table_name);
    exception when others then
      null; -- versão sem security_invoker: o revoke do anon já protege
    end;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 6. Materialized views (se houver): bloqueia anon
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select matviewname from pg_matviews where schemaname = 'public'
  loop
    execute format('revoke select on public.%I from anon;', r.matviewname);
    execute format('grant select on public.%I to authenticated;', r.matviewname);
  end loop;
end $$;

-- ============================================================
-- Fim. Depois de rodar:
--  - Dashboard SEM login -> não lê nada (anon bloqueado).
--  - Dashboard COM login -> lê/escreve normal (authenticated).
--  - Chatbot (service_role) -> inalterado.
-- ============================================================