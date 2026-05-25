create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('vehicles', 'vehicles', true)
on conflict (id) do update set public = true;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  nome text,
  role text default 'admin',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_app_users_single_admin
on app_users ((true));

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  nome text,
  whatsapp text,
  instagram text,
  endereco text,
  cidade text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  marca text not null,
  modelo text not null,
  ano text not null,
  combustivel text,
  cambio text,
  km text,
  preco text,
  cidade text,
  cor text,
  opcionais text[],
  descricao text,
  destaque boolean default false,
  hero boolean default false,
  categoria text,
  whatsapp text,
  visualizacoes integer default 0,
  status text default 'disponivel',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  url text not null,
  filename text,
  position integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_vehicles_marca on vehicles (marca);
create index if not exists idx_vehicles_categoria on vehicles (categoria);
create index if not exists idx_vehicles_status on vehicles (status);
create index if not exists idx_vehicles_destaque on vehicles (destaque);
create index if not exists idx_vehicles_hero on vehicles (hero);
create index if not exists idx_vehicles_created_at on vehicles (created_at desc);
create index if not exists idx_vehicle_images_vehicle_id on vehicle_images (vehicle_id);

drop trigger if exists set_app_users_updated_at on app_users;
create trigger set_app_users_updated_at
before update on app_users
for each row execute function set_updated_at();

drop trigger if exists set_settings_updated_at on settings;
create trigger set_settings_updated_at
before update on settings
for each row execute function set_updated_at();

drop trigger if exists set_vehicles_updated_at on vehicles;
create trigger set_vehicles_updated_at
before update on vehicles
for each row execute function set_updated_at();

create or replace function ensure_single_hero()
returns trigger as $$
begin
  if new.hero = true then
    update vehicles
    set hero = false
    where id <> new.id
      and hero = true;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists ensure_single_hero_trigger on vehicles;
create trigger ensure_single_hero_trigger
before insert or update of hero on vehicles
for each row execute function ensure_single_hero();

create or replace function increment_vehicle_views(vehicle_uuid uuid)
returns void as $$
begin
  update vehicles
  set visualizacoes = coalesce(visualizacoes, 0) + 1
  where id = vehicle_uuid;
end;
$$ language plpgsql;
