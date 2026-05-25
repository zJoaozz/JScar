-- =============================================================================
-- JScar – Hardening de Segurança Supabase
-- Aplique este arquivo no SQL Editor do Supabase (Run uma vez)
-- Seguro para produção: não remove dados, não quebra o backend
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PARTE 1 – Ativar RLS nas tabelas públicas
-- O service_role do backend tem bypassrls = true, então continua
-- operando normalmente sem nenhuma política adicional.
-- -----------------------------------------------------------------------------

alter table public.settings       enable row level security;
alter table public.vehicles        enable row level security;
alter table public.vehicle_images  enable row level security;
alter table public.app_users       enable row level security;


-- -----------------------------------------------------------------------------
-- PARTE 2 – Políticas de SELECT público (leitura aberta, sem autenticação)
-- Qualquer visitante pode listar veículos e configurações da loja,
-- mas ninguém pode escrever, alterar ou excluir via cliente anônimo.
-- -----------------------------------------------------------------------------

-- settings: qualquer um pode ler (nome da loja, whatsapp, endereço…)
drop policy if exists "public_select_settings" on public.settings;
create policy "public_select_settings"
  on public.settings
  for select
  using (true);

-- vehicles: qualquer um pode ver o catálogo
drop policy if exists "public_select_vehicles" on public.vehicles;
create policy "public_select_vehicles"
  on public.vehicles
  for select
  using (true);

-- vehicle_images: qualquer um pode ver as imagens dos veículos
drop policy if exists "public_select_vehicle_images" on public.vehicle_images;
create policy "public_select_vehicle_images"
  on public.vehicle_images
  for select
  using (true);

-- app_users: sem política pública — nenhuma role anônima lê esta tabela.
-- O backend acessa via service_role (bypassrls), então não precisa de política.


-- -----------------------------------------------------------------------------
-- PARTE 3 – Corrigir search_path nas funções (Supabase Advisor warning)
-- Um search_path mutável permite que um atacante substitua objetos do schema
-- se conseguir criar objetos em schemas não-qualificados.
-- Fixar em 'public' elimina esse vetor.
-- -----------------------------------------------------------------------------

-- Função: set_updated_at
-- Dispara antes de qualquer UPDATE para atualizar o campo updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Função: ensure_single_hero
-- Garante que apenas um veículo tenha hero = true por vez.
create or replace function public.ensure_single_hero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hero = true then
    update vehicles
    set hero = false
    where id <> new.id
      and hero = true;
  end if;
  return new;
end;
$$;

-- Função: increment_vehicle_views
-- Incrementa o contador de visualizações de um veículo pelo seu UUID.
create or replace function public.increment_vehicle_views(vehicle_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update vehicles
  set visualizacoes = coalesce(visualizacoes, 0) + 1
  where id = vehicle_uuid;
end;
$$;


-- -----------------------------------------------------------------------------
-- PARTE 4 – Verificação final (opcional, rode no SQL Editor para conferir)
-- -----------------------------------------------------------------------------

-- Confirmar RLS ativado:
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in ('settings', 'vehicles', 'vehicle_images', 'app_users');

-- Confirmar políticas criadas:
-- select tablename, policyname, cmd, qual
-- from pg_policies
-- where schemaname = 'public';

-- Confirmar search_path fixo nas funções:
-- select proname, proconfig
-- from pg_proc
-- join pg_namespace on pg_proc.pronamespace = pg_namespace.oid
-- where nspname = 'public'
--   and proname in ('set_updated_at', 'ensure_single_hero', 'increment_vehicle_views');
