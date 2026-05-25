-- JScar - Categorias de veículos
-- Execute no SQL Editor do Supabase.

create table if not exists public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  icon text,
  sort_order integer default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_vehicle_categories_slug on public.vehicle_categories (slug);
create index if not exists idx_vehicle_categories_active on public.vehicle_categories (active);
create index if not exists idx_vehicle_categories_sort_order on public.vehicle_categories (sort_order);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_vehicle_categories_updated_at on public.vehicle_categories;

create trigger trg_vehicle_categories_updated_at
before update on public.vehicle_categories
for each row
execute function public.set_updated_at();

insert into public.vehicle_categories (name, slug, description, icon, sort_order, active)
select name, slug, description, icon, sort_order, true
from (
  values
    ('Hatch', 'hatch', 'Compactos e econômicos', 'bi-car-front-fill', 1),
    ('Sedan', 'sedan', 'Conforto para o dia a dia', 'bi-car-front', 2),
    ('SUV', 'suv', 'Espaço, presença e conforto', 'bi-truck-front-fill', 3),
    ('Picape', 'picape', 'Força para qualquer terreno', 'bi-truck', 4),
    ('Elétrico', 'eletrico', 'Tecnologia e eficiência', 'bi-lightning-charge-fill', 5),
    ('Premium', 'premium', 'Modelos exclusivos', 'bi-gem', 6),
    ('Moto', 'moto', 'Agilidade para sua rotina', 'bi-bicycle', 7)
) as defaults(name, slug, description, icon, sort_order)
where not exists (select 1 from public.vehicle_categories);
