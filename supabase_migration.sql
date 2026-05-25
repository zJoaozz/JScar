-- =============================================================================
-- JScar – Migration Completa do Banco de Dados Supabase
-- Execute TODO este arquivo no SQL Editor do Supabase de uma vez só.
-- É seguro rodar múltiplas vezes (usa IF NOT EXISTS e OR REPLACE).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PARTE 0 – Extensões necessárias
-- -----------------------------------------------------------------------------

create extension if not exists pgcrypto;


-- -----------------------------------------------------------------------------
-- PARTE 1 – Storage: bucket público para imagens de veículos
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('vehicles', 'vehicles', true)
on conflict (id) do update set public = true;


-- -----------------------------------------------------------------------------
-- PARTE 2 – Função auxiliar para atualizar 'updated_at' automaticamente
-- Usada por triggers em todas as tabelas.
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- PARTE 3 – Tabela: app_users (administradores do sistema)
-- Apenas um admin é permitido (unique index garante isso).
-- -----------------------------------------------------------------------------

create table if not exists public.app_users (
  id            uuid        primary key default gen_random_uuid(),
  email         text        unique not null,
  password_hash text        not null,
  nome          text,
  role          text        default 'admin',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Garante que só exista um único usuário admin no sistema
create unique index if not exists idx_app_users_single_admin
  on public.app_users ((true));

drop trigger if exists set_app_users_updated_at on public.app_users;
create trigger set_app_users_updated_at
  before update on public.app_users
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- PARTE 4 – Tabela: settings (configurações da loja)
-- Nome, WhatsApp, Instagram, endereço, cidade.
-- -----------------------------------------------------------------------------

create table if not exists public.settings (
  id         uuid        primary key default gen_random_uuid(),
  nome       text,
  whatsapp   text,
  instagram  text,
  endereco   text,
  cidade     text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_settings_updated_at on public.settings;
create trigger set_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- PARTE 5 – Tabela: vehicle_categories (categorias de veículos)
-- Esta é a tabela que estava faltando e causava o erro crítico!
-- -----------------------------------------------------------------------------

create table if not exists public.vehicle_categories (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        unique not null,
  description text,
  image_url   text,
  icon        text,
  sort_order  integer     default 0,
  active      boolean     default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_vehicle_categories_slug
  on public.vehicle_categories (slug);
create index if not exists idx_vehicle_categories_active
  on public.vehicle_categories (active);
create index if not exists idx_vehicle_categories_sort_order
  on public.vehicle_categories (sort_order);

drop trigger if exists trg_vehicle_categories_updated_at on public.vehicle_categories;
create trigger trg_vehicle_categories_updated_at
  before update on public.vehicle_categories
  for each row execute function public.set_updated_at();

-- Categorias padrão (só insere se a tabela estiver vazia)
insert into public.vehicle_categories (name, slug, description, icon, sort_order, active)
select name, slug, description, icon, sort_order, true
from (
  values
    ('Hatch',    'hatch',   'Compactos e econômicos',       'bi-car-front-fill',       1),
    ('Sedan',    'sedan',   'Conforto para o dia a dia',    'bi-car-front',            2),
    ('SUV',      'suv',     'Espaço, presença e conforto',  'bi-truck-front-fill',     3),
    ('Picape',   'picape',  'Força para qualquer terreno',  'bi-truck',                4),
    ('Elétrico', 'eletrico','Tecnologia e eficiência',      'bi-lightning-charge-fill',5),
    ('Premium',  'premium', 'Modelos exclusivos',           'bi-gem',                  6),
    ('Moto',     'moto',    'Agilidade para sua rotina',    'bi-bicycle',              7)
) as defaults(name, slug, description, icon, sort_order)
where not exists (select 1 from public.vehicle_categories);


-- -----------------------------------------------------------------------------
-- PARTE 6 – Tabela: vehicles (catálogo de veículos)
-- -----------------------------------------------------------------------------

create table if not exists public.vehicles (
  id            uuid        primary key default gen_random_uuid(),
  titulo        text        not null,
  marca         text        not null,
  modelo        text        not null,
  ano           text        not null,
  combustivel   text,
  cambio        text,
  km            text,
  preco         text,
  cidade        text,
  cor           text,
  opcionais     text[],
  descricao     text,
  destaque      boolean     default false,
  hero          boolean     default false,
  categoria     text,
  whatsapp      text,
  visualizacoes integer     default 0,
  status        text        default 'disponivel',  -- 'disponivel' | 'reservado' | 'vendido'
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_vehicles_marca      on public.vehicles (marca);
create index if not exists idx_vehicles_categoria  on public.vehicles (categoria);
create index if not exists idx_vehicles_status     on public.vehicles (status);
create index if not exists idx_vehicles_destaque   on public.vehicles (destaque);
create index if not exists idx_vehicles_hero       on public.vehicles (hero);
create index if not exists idx_vehicles_created_at on public.vehicles (created_at desc);

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- PARTE 7 – Tabela: vehicle_images (fotos dos veículos)
-- Deletar o veículo apaga as imagens em cascata.
-- -----------------------------------------------------------------------------

create table if not exists public.vehicle_images (
  id          uuid        primary key default gen_random_uuid(),
  vehicle_id  uuid        references public.vehicles(id) on delete cascade,
  url         text        not null,
  filename    text,
  position    integer     default 0,
  created_at  timestamptz default now()
);

create index if not exists idx_vehicle_images_vehicle_id
  on public.vehicle_images (vehicle_id);


-- -----------------------------------------------------------------------------
-- PARTE 8 – Funções de negócio
-- -----------------------------------------------------------------------------

-- Garante que apenas um veículo tenha hero = true por vez
create or replace function public.ensure_single_hero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hero = true then
    update public.vehicles
    set hero = false
    where id <> new.id
      and hero = true;
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_single_hero_trigger on public.vehicles;
create trigger ensure_single_hero_trigger
  before insert or update of hero on public.vehicles
  for each row execute function public.ensure_single_hero();

-- Incrementa o contador de visualizações de um veículo
create or replace function public.increment_vehicle_views(vehicle_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vehicles
  set visualizacoes = coalesce(visualizacoes, 0) + 1
  where id = vehicle_uuid;
end;
$$;


-- -----------------------------------------------------------------------------
-- PARTE 9 – Row Level Security (RLS)
-- O backend usa SUPABASE_SERVICE_ROLE_KEY que tem bypassrls = true,
-- então ele sempre consegue ler e escrever, independente das policies.
-- As policies abaixo controlam apenas acesso anônimo (visitantes do site).
-- -----------------------------------------------------------------------------

-- Ativar RLS em todas as tabelas
alter table public.app_users         enable row level security;
alter table public.settings          enable row level security;
alter table public.vehicle_categories enable row level security;
alter table public.vehicles          enable row level security;
alter table public.vehicle_images    enable row level security;

-- settings: qualquer visitante pode ler (nome da loja, contato, endereço)
drop policy if exists "public_select_settings" on public.settings;
create policy "public_select_settings"
  on public.settings
  for select
  using (true);

-- vehicle_categories: qualquer visitante pode ler as categorias ativas
drop policy if exists "public_select_vehicle_categories" on public.vehicle_categories;
create policy "public_select_vehicle_categories"
  on public.vehicle_categories
  for select
  using (active = true);

-- vehicles: qualquer visitante pode ver o catálogo
drop policy if exists "public_select_vehicles" on public.vehicles;
create policy "public_select_vehicles"
  on public.vehicles
  for select
  using (true);

-- vehicle_images: qualquer visitante pode ver as fotos
drop policy if exists "public_select_vehicle_images" on public.vehicle_images;
create policy "public_select_vehicle_images"
  on public.vehicle_images
  for select
  using (true);

-- app_users: sem policy pública — nenhuma role anônima acessa esta tabela
-- O backend acessa via service_role (bypassrls), não precisa de policy.


-- -----------------------------------------------------------------------------
-- PARTE 10 – GRANTs de permissão por role
-- Garante que as roles do Supabase tenham acesso explícito às tabelas.
-- O service_role já tem acesso total, mas anon/authenticated precisam de GRANT
-- para as tabelas onde RLS permite SELECT.
-- -----------------------------------------------------------------------------

-- Permissões para leitura pública (role anon = visitantes não autenticados)
grant usage on schema public to anon, authenticated, service_role;

grant select on public.settings           to anon, authenticated;
grant select on public.vehicle_categories to anon, authenticated;
grant select on public.vehicles           to anon, authenticated;
grant select on public.vehicle_images     to anon, authenticated;

-- O service_role precisa de acesso completo para o backend funcionar
grant all on public.app_users            to service_role;
grant all on public.settings             to service_role;
grant all on public.vehicle_categories   to service_role;
grant all on public.vehicles             to service_role;
grant all on public.vehicle_images       to service_role;

-- Permissão para executar as funções
grant execute on function public.increment_vehicle_views(uuid) to anon, authenticated, service_role;
grant execute on function public.set_updated_at()              to service_role;
grant execute on function public.ensure_single_hero()          to service_role;


-- -----------------------------------------------------------------------------
-- PARTE 11 – Verificação final (descomente para confirmar após rodar)
-- -----------------------------------------------------------------------------

-- Confirmar que todas as tabelas foram criadas:
-- select tablename from pg_tables where schemaname = 'public' order by tablename;

-- Confirmar RLS ativado:
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public'
--   and tablename in ('app_users','settings','vehicle_categories','vehicles','vehicle_images');

-- Confirmar policies criadas:
-- select tablename, policyname, cmd from pg_policies where schemaname = 'public';

-- Confirmar categorias inseridas:
-- select id, name, slug, active from public.vehicle_categories order by sort_order;
