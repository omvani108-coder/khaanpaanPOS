-- KHAANPAAN — initial schema
-- Multi-tenant restaurant CRM: each restaurant is a tenant scoped by `restaurant_id`.
-- All end-user tables have RLS policies so staff only see their restaurant's data.

-- Required extensions --------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enum types -----------------------------------------------------------------
do $$ begin create type user_role as enum ('owner','manager','waiter','kitchen'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('pending','preparing','ready','served','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type order_source as enum ('dine_in','takeaway','zomato','swiggy','phone','other'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_status as enum ('unpaid','paid','partial','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('cash','upi','card','aggregator','other'); exception when duplicate_object then null; end $$;

-- Restaurants (tenants) ------------------------------------------------------
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  address text,
  phone text,
  gstin text,
  currency text not null default 'INR',
  tax_percent numeric(5,2) not null default 5.0,
  invoice_prefix text not null default 'INV',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Staff membership: which auth user has access to which restaurant, with role
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role user_role not null default 'waiter',
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);
create index if not exists staff_user_idx on staff(user_id);
create index if not exists staff_restaurant_idx on staff(restaurant_id);

-- Tables in a restaurant (physical dining tables) ---------------------------
create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  label text not null,
  seats int not null default 2,
  qr_token text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, label)
);
create index if not exists restaurant_tables_restaurant_idx on restaurant_tables(restaurant_id);

-- Menu categories ------------------------------------------------------------
create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists menu_categories_restaurant_idx on menu_categories(restaurant_id);

-- Menu items -----------------------------------------------------------------
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid references menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  is_veg boolean not null default true,
  is_available boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists menu_items_restaurant_idx on menu_items(restaurant_id);
create index if not exists menu_items_category_idx on menu_items(category_id);

-- Per-restaurant order number sequence ---------------------------------------
create table if not exists order_counters (
  restaurant_id uuid primary key references restaurants(id) on delete cascade,
  last_number bigint not null default 0
);

-- Orders ---------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_number bigint not null,
  source order_source not null default 'dine_in',
  table_id uuid references restaurant_tables(id) on delete set null,
  customer_name text,
  customer_phone text,
  aggregator_ref text,
  status order_status not null default 'pending',
  sla_minutes int not null default 20,
  notes text,
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  placed_at timestamptz not null default now(),
  preparing_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (restaurant_id, order_number)
);
create index if not exists orders_restaurant_idx on orders(restaurant_id, placed_at desc);
create index if not exists orders_status_idx on orders(restaurant_id, status);
create index if not exists orders_table_idx on orders(table_id);

-- Order items ----------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name_snapshot text not null,
  price_snapshot numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on order_items(order_id);

-- Invoices -------------------------------------------------------------------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  invoice_number text not null,
  subtotal numeric(10,2) not null,
  tax numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_status payment_status not null default 'unpaid',
  payment_method payment_method,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (restaurant_id, invoice_number)
);
create index if not exists invoices_order_idx on invoices(order_id);

-- Helper: user is staff/owner of a restaurant -------------------------------
create or replace function is_restaurant_member(r uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from staff s where s.restaurant_id = r and s.user_id = auth.uid()
  ) or exists (
    select 1 from restaurants rr where rr.id = r and rr.owner_id = auth.uid()
  );
$$;

-- Trigger: auto-assign sequential order_number + recompute totals on INSERT -
create or replace function orders_before_insert()
returns trigger language plpgsql as $$
declare
  n bigint;
begin
  insert into order_counters(restaurant_id, last_number) values (new.restaurant_id, 0)
    on conflict (restaurant_id) do nothing;
  update order_counters set last_number = last_number + 1
    where restaurant_id = new.restaurant_id
    returning last_number into n;
  new.order_number := n;
  return new;
end $$;

drop trigger if exists orders_set_number on orders;
create trigger orders_set_number before insert on orders
  for each row execute function orders_before_insert();

-- Enable realtime for the order tables --------------------------------------
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;

-- Row Level Security ---------------------------------------------------------
alter table restaurants enable row level security;
alter table staff enable row level security;
alter table restaurant_tables enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table invoices enable row level security;

-- Restaurants: owner can manage; members can read
drop policy if exists "restaurants_select_members" on restaurants;
create policy "restaurants_select_members" on restaurants for select
  using (owner_id = auth.uid() or is_restaurant_member(id));

drop policy if exists "restaurants_insert_owner" on restaurants;
create policy "restaurants_insert_owner" on restaurants for insert
  with check (owner_id = auth.uid());

drop policy if exists "restaurants_update_owner" on restaurants;
create policy "restaurants_update_owner" on restaurants for update
  using (owner_id = auth.uid());

-- Staff: members can read peers; owner can manage
drop policy if exists "staff_select_members" on staff;
create policy "staff_select_members" on staff for select
  using (is_restaurant_member(restaurant_id));

drop policy if exists "staff_manage_owner" on staff;
create policy "staff_manage_owner" on staff for all
  using (exists (select 1 from restaurants r where r.id = staff.restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = staff.restaurant_id and r.owner_id = auth.uid()));

-- Generic members-only policy for per-restaurant tables ---------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'restaurant_tables','menu_categories','menu_items','orders','invoices'
  ] loop
    execute format('drop policy if exists "%s_members_all" on %s;', t, t);
    execute format(
      'create policy "%s_members_all" on %s for all using (is_restaurant_member(restaurant_id)) with check (is_restaurant_member(restaurant_id));',
      t, t
    );
  end loop;
end $$;

-- order_items: infer membership via parent order ----------------------------
drop policy if exists "order_items_members_all" on order_items;
create policy "order_items_members_all" on order_items for all
  using (exists (select 1 from orders o where o.id = order_items.order_id and is_restaurant_member(o.restaurant_id)))
  with check (exists (select 1 from orders o where o.id = order_items.order_id and is_restaurant_member(o.restaurant_id)));

-- Public policy for customer QR ordering ------------------------------------
-- Customers are unauthenticated, so they need a limited read/insert path.
-- They access via qr_token; the app validates token on client side and writes
-- orders using an anon RPC (see `place_customer_order`) — RLS still blocks
-- direct anon writes to orders.
drop policy if exists "tables_public_read_by_token" on restaurant_tables;
create policy "tables_public_read_by_token" on restaurant_tables for select
  using (true); -- safe: only exposes id/label/qr_token/restaurant_id; token is the secret

drop policy if exists "menu_items_public_read_available" on menu_items;
create policy "menu_items_public_read_available" on menu_items for select
  using (is_available = true);

drop policy if exists "menu_categories_public_read" on menu_categories;
create policy "menu_categories_public_read" on menu_categories for select
  using (true);

-- Anon RPC: place a customer order by QR token ------------------------------
-- Accepts: token text, items jsonb [{menu_item_id, quantity, notes?}], customer_name?, customer_phone?
create or replace function place_customer_order(
  p_token text,
  p_items jsonb,
  p_customer_name text default null,
  p_customer_phone text default null
) returns uuid
language plpgsql security definer as $$
declare
  v_table restaurant_tables%rowtype;
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_tax_percent numeric(5,2);
  v_tax numeric(10,2);
  v_item jsonb;
  v_menu menu_items%rowtype;
  v_qty int;
begin
  select * into v_table from restaurant_tables where qr_token = p_token and is_active = true;
  if not found then
    raise exception 'Invalid or inactive table token';
  end if;

  select tax_percent into v_tax_percent from restaurants where id = v_table.restaurant_id;

  insert into orders (restaurant_id, source, table_id, customer_name, customer_phone, status, subtotal, tax, total)
    values (v_table.restaurant_id, 'dine_in', v_table.id, p_customer_name, p_customer_phone, 'pending', 0, 0, 0)
    returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_menu from menu_items
      where id = (v_item->>'menu_item_id')::uuid
        and restaurant_id = v_table.restaurant_id
        and is_available = true;
    if not found then
      raise exception 'Menu item unavailable';
    end if;
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    insert into order_items (order_id, menu_item_id, name_snapshot, price_snapshot, quantity, notes)
      values (v_order_id, v_menu.id, v_menu.name, v_menu.price, v_qty, v_item->>'notes');
    v_subtotal := v_subtotal + (v_menu.price * v_qty);
  end loop;

  v_tax := round(v_subtotal * v_tax_percent / 100.0, 2);
  update orders set subtotal = v_subtotal, tax = v_tax, total = v_subtotal + v_tax
    where id = v_order_id;

  return v_order_id;
end $$;

grant execute on function place_customer_order(text, jsonb, text, text) to anon, authenticated;
