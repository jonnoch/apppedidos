-- ============================================================================
-- PedidosPizza — Esquema de base de datos (Supabase / Postgres)
-- Pizzería 90 grados
--
-- Modelo multi-sede desde el día 1: cada precio de producto, pedido y usuario
-- del personal pertenece a un location_id. Los precios pueden variar por sede.
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> pegar -> Run.
-- Luego ejecutar seed.sql para cargar la sede piloto y su menú.
-- ============================================================================

-- Extensiones -----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. SEDES (locations)
-- ----------------------------------------------------------------------------
create table if not exists public.locations (
  id          text primary key,              -- p.ej. 'facatativa-piloto'
  name        text not null,
  whatsapp    text,                           -- número al que se envía el pedido
  phone       text,
  nequi_daviplata text,
  hours_text  text not null default 'Lunes a domingo, 1:00 p.m. - 10:00 p.m.',
  -- Horario numérico para bloquear pedidos fuera de servicio (hora local Bogotá)
  open_hour   int  not null default 13,       -- 13 = 1:00 p.m.
  close_hour  int  not null default 22,       -- 22 = 10:00 p.m.
  orders_paused boolean not null default false,
  base_delivery_fee int not null default 4000,
  min_order   int not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. PUEBLOS CUBIERTOS (delivery zones) — por sede, editables por el dueño
-- ----------------------------------------------------------------------------
create table if not exists public.delivery_zones (
  id           uuid primary key default gen_random_uuid(),
  location_id  text not null references public.locations(id) on delete cascade,
  name         text not null,                 -- 'Facatativá', 'El Rosal', ...
  km           numeric(6,2) not null default 0,
  delivery_fee int not null,                  -- COP, entero
  is_home_town boolean not null default false,
  sort_order   int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (location_id, name)
);

-- ----------------------------------------------------------------------------
-- 3. CATEGORÍAS
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          text primary key,              -- 'pizzas', 'bebidas', ...
  name        text not null,
  note        text,
  sort_order  int not null default 0
);

-- ----------------------------------------------------------------------------
-- 4. PRODUCTOS — pertenecen a una sede; el precio es por sede
--    product_type:
--      'pizza'  -> usa tamaños (product_sizes) y sabores (flavors)
--      'simple' -> precio propio
--      'combo'  -> precio propio + requiere elegir gaseosa
--      'drink_choice' -> bebida que deja elegir sabor de gaseosa
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  location_id   text not null references public.locations(id) on delete cascade,
  category_id   text not null references public.categories(id),
  slug          text not null,               -- id legible del menú original
  name          text not null,
  description   text,
  product_type  text not null default 'simple'
                check (product_type in ('pizza','simple','combo','drink_choice')),
  price         int,                          -- COP; null para pizzas (usa tamaños)
  is_alcohol    boolean not null default false,
  requires_drink_choice boolean not null default false, -- combos
  drink_options text[] not null default '{}', -- p.ej. {'Coca-Cola 250 ml',...}
  sold_out      boolean not null default false,
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  unique (location_id, slug)
);

-- ----------------------------------------------------------------------------
-- 5. TAMAÑOS DE PIZZA — precio por sede (viven con el producto)
-- ----------------------------------------------------------------------------
create table if not exists public.product_sizes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  slug        text not null,                 -- 'porcion','junior',...
  name        text not null,
  portions    int,                           -- porciones; null si no aplica
  price       int not null,                  -- COP, por sede
  max_flavors int not null default 1,
  sort_order  int not null default 0,
  sold_out    boolean not null default false,
  unique (product_id, slug)
);

-- ----------------------------------------------------------------------------
-- 6. SABORES DE PIZZA — por categoría/sede
-- ----------------------------------------------------------------------------
create table if not exists public.flavors (
  id          uuid primary key default gen_random_uuid(),
  location_id text not null references public.locations(id) on delete cascade,
  category_id text not null references public.categories(id),
  name        text not null,
  active      boolean not null default true,
  sold_out    boolean not null default false,
  sort_order  int not null default 0,
  unique (location_id, category_id, name)
);

-- ----------------------------------------------------------------------------
-- 7. PERSONAL (staff) — pertenece a una sede. Vinculado a auth.users de Supabase.
--    role: 'owner' | 'kitchen' | 'driver'
-- ----------------------------------------------------------------------------
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade, -- null para drivers con PIN
  location_id text not null references public.locations(id) on delete cascade,
  name        text not null,
  role        text not null check (role in ('owner','kitchen','driver')),
  pin         text,                           -- PIN para repartidores (login simple)
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists staff_user_id_idx on public.staff(user_id);
create index if not exists staff_location_role_idx on public.staff(location_id, role);

-- ----------------------------------------------------------------------------
-- 8. PEDIDOS (orders) — pertenecen a una sede
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  location_id   text not null references public.locations(id) on delete cascade,
  order_number  int not null,                 -- consecutivo por sede
  status        text not null default 'nuevo'
                check (status in ('nuevo','en_preparacion','listo','en_camino','entregado','cancelado')),
  customer_name text not null,
  customer_phone text not null,
  address       text not null,
  town          text not null,
  notes         text,
  payment_method text not null check (payment_method in ('efectivo','transferencia')),
  delivery_fee  int not null default 0,
  subtotal      int not null default 0,
  total         int not null default 0,
  has_alcohol   boolean not null default false,
  age_confirmed boolean not null default false,
  consent_accepted boolean not null default false,
  driver_id     uuid references public.staff(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists orders_location_status_idx on public.orders(location_id, status);
create index if not exists orders_driver_idx on public.orders(driver_id);
create index if not exists orders_created_idx on public.orders(created_at);

-- Ítems del pedido (snapshot de nombre/precio al momento de ordenar)
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_name  text not null,
  size_name     text,
  flavors       text[] not null default '{}',
  drink_choice  text,
  quantity      int not null default 1,
  unit_price    int not null,
  line_total    int not null,
  notes         text
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ----------------------------------------------------------------------------
-- 9. Consecutivo de pedidos por sede (order_number)
-- ----------------------------------------------------------------------------
create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = 0 then
    select coalesce(max(order_number), 0) + 1
      into new.order_number
      from public.orders
     where location_id = new.location_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_order_number on public.orders;
create trigger trg_set_order_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_touch on public.orders;
create trigger trg_orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 10. Helper: ¿el usuario autenticado pertenece a esta sede? (para RLS)
-- ----------------------------------------------------------------------------
create or replace function public.is_staff_of(loc text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = auth.uid()
      and s.location_id = loc
      and s.active = true
  );
$$;

create or replace function public.is_owner_of(loc text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = auth.uid()
      and s.location_id = loc
      and s.role = 'owner'
      and s.active = true
  );
$$;

-- ============================================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================================
alter table public.locations      enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.product_sizes  enable row level security;
alter table public.flavors        enable row level security;
alter table public.staff          enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;

-- --- Lectura pública del catálogo (la página del cliente no usa login) -------
drop policy if exists "read locations" on public.locations;
create policy "read locations" on public.locations for select using (true);

drop policy if exists "read zones" on public.delivery_zones;
create policy "read zones" on public.delivery_zones for select using (true);

drop policy if exists "read categories" on public.categories;
create policy "read categories" on public.categories for select using (true);

drop policy if exists "read products" on public.products;
create policy "read products" on public.products for select using (true);

drop policy if exists "read sizes" on public.product_sizes;
create policy "read sizes" on public.product_sizes for select using (true);

drop policy if exists "read flavors" on public.flavors;
create policy "read flavors" on public.flavors for select using (true);

-- --- El dueño gestiona el menú de su sede -----------------------------------
drop policy if exists "owner writes locations" on public.locations;
create policy "owner writes locations" on public.locations
  for update using (public.is_owner_of(id)) with check (public.is_owner_of(id));

drop policy if exists "owner writes zones" on public.delivery_zones;
create policy "owner writes zones" on public.delivery_zones
  for all using (public.is_owner_of(location_id)) with check (public.is_owner_of(location_id));

drop policy if exists "owner writes products" on public.products;
create policy "owner writes products" on public.products
  for all using (public.is_owner_of(location_id)) with check (public.is_owner_of(location_id));

drop policy if exists "owner writes sizes" on public.product_sizes;
create policy "owner writes sizes" on public.product_sizes
  for all using (
    exists (select 1 from public.products p where p.id = product_id and public.is_owner_of(p.location_id))
  ) with check (
    exists (select 1 from public.products p where p.id = product_id and public.is_owner_of(p.location_id))
  );

drop policy if exists "owner writes flavors" on public.flavors;
create policy "owner writes flavors" on public.flavors
  for all using (public.is_owner_of(location_id)) with check (public.is_owner_of(location_id));

-- --- Staff: puede leer el personal de su sede --------------------------------
drop policy if exists "staff reads staff" on public.staff;
create policy "staff reads staff" on public.staff
  for select using (public.is_staff_of(location_id));

drop policy if exists "owner writes staff" on public.staff;
create policy "owner writes staff" on public.staff
  for all using (public.is_owner_of(location_id)) with check (public.is_owner_of(location_id));

-- --- Pedidos -----------------------------------------------------------------
-- El cliente anónimo NO inserta pedidos directamente: se insertan vía API route
-- del servidor con la service role key (que omite RLS). Así validamos reglas
-- de negocio en el servidor y evitamos abusos.
-- El staff de la sede puede leer y actualizar los pedidos de su sede.
drop policy if exists "staff reads orders" on public.orders;
create policy "staff reads orders" on public.orders
  for select using (public.is_staff_of(location_id));

drop policy if exists "staff updates orders" on public.orders;
create policy "staff updates orders" on public.orders
  for update using (public.is_staff_of(location_id)) with check (public.is_staff_of(location_id));

drop policy if exists "staff reads order_items" on public.order_items;
create policy "staff reads order_items" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and public.is_staff_of(o.location_id))
  );

-- ============================================================================
-- 12. REALTIME: publicar cambios de pedidos
-- ============================================================================
-- Ejecutar una sola vez (ignora el error si ya existe la publicación):
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
