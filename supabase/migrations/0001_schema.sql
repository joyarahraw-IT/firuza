-- Firuza · 0001 schema
-- Run migrations 0001 → 0004 in order (Supabase dashboard → SQL Editor), or paste supabase/setup.sql once.


do $$ begin create type product_status as enum ('draft', 'published'); exception when duplicate_object then null; end $$;
do $$ begin create type delivery_mode as enum ('made_to_order', 'shipped'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('nuevo', 'confirmado', 'pagado', 'en_preparacion', 'enviado', 'entregado', 'cancelado'); exception when duplicate_object then null; end $$;
do $$ begin create type review_status as enum ('pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type message_status as enum ('new', 'read', 'archived'); exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- catalogue
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  blurb       text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  category_id       uuid references public.categories (id) on delete set null,
  name              text not null,
  description       text not null default '',
  care              text,
  materials_note    text,
  status            product_status not null default 'draft',
  delivery_mode     delivery_mode  not null default 'made_to_order',
  making_days_min   int,
  making_days_max   int,
  shipping_days_min int,
  shipping_days_max int,
  colors            jsonb not null default '[]',        -- [{name, hex}]
  option_groups     jsonb not null default '[]',        -- [{name, required, values[]}]
  base_price_cents  int  not null check (base_price_cents >= 0),
  featured          boolean not null default false,
  needs_real_photo  boolean not null default false,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint making_days_range check (
    making_days_min is null
    or (making_days_min between 1 and 10 and making_days_max between making_days_min and 10)),
  constraint shipping_days_range check (
    shipping_days_min is null
    or (shipping_days_min >= 1 and shipping_days_max >= shipping_days_min and shipping_days_max <= 60)),
  constraint delivery_days_present check (
    (delivery_mode = 'made_to_order' and making_days_min is not null)
    or (delivery_mode = 'shipped' and shipping_days_min is not null))
);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_status_idx   on public.products (status);
drop trigger if exists products_updated on public.products;
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();

-- one row per purchasable combination of options (Material × Modelo × Talla …), with its own price
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  options     jsonb not null default '{}',
  price_cents int  not null check (price_cents >= 0),
  sku         text,
  active      boolean not null default true,
  sort_order  int not null default 0,
  unique (product_id, options)
);
create index if not exists product_variants_product_idx on public.product_variants (product_id);

-- files live in Storage bucket "product-images" as <storage_key>.webp / .jpg / -thumb.webp
create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  storage_key text not null,
  alt         text,
  role        text,
  is_cover    boolean not null default false,
  sort_order  int not null default 0
);
create index if not exists product_images_product_idx on public.product_images (product_id);
create unique index if not exists product_images_one_cover on public.product_images (product_id) where is_cover;

-- ---------------------------------------------------------------- people
-- profile of a shop customer (linked to Supabase Auth). Admins are separate auth users listed in admin_users.
create table if not exists public.customers (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists customers_updated on public.customers;
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();

create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label       text,
  full_name   text not null,
  phone       text,
  line1       text not null,
  line2       text,
  postal_code text not null,
  city        text not null,
  province    text,
  country     text not null default 'ES',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists addresses_customer_idx on public.addresses (customer_id);

create table if not exists public.admin_users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         text not null default 'owner',
  mfa_required boolean not null default true,       -- RLS only trusts an admin whose session is AAL2 (TOTP)
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  number           text not null unique,             -- FZ-YYMMDD-XXXX
  customer_id      uuid references public.customers (id) on delete set null,
  status           order_status not null default 'nuevo',
  contact_name     text not null,
  contact_email    text not null,
  contact_phone    text not null,
  shipping_address jsonb not null,
  notes            text,                            -- customer's note
  subtotal_cents   int not null default 0,
  shipping_cents   int not null default 0,
  total_cents      int not null default 0,
  currency         text not null default 'EUR',
  estimated_from   date,                            -- estimated arrival range shown to the customer
  estimated_to     date,
  due_date         date,                            -- editable by the owner
  tracking_number  text,
  payment_method   text,
  accepted_terms_at timestamptz not null,
  locale           text not null default 'es',
  placed_at        timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_status_idx   on public.orders (status);
drop trigger if exists orders_updated on public.orders;
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();

-- prices and names are COPIED at purchase time, so later edits to the catalogue never change an order
create table if not exists public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        uuid references public.products (id) on delete set null,
  variant_id        uuid references public.product_variants (id) on delete set null,
  name              text not null,
  options           jsonb not null default '{}',
  unit_price_cents  int  not null,
  quantity          int  not null check (quantity between 1 and 10),
  line_total_cents  int  not null,
  delivery_mode     delivery_mode not null,
  making_days_min   int,
  making_days_max   int,
  shipping_days_min int,
  shipping_days_max int,
  image_key         text
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.order_status_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     order_status not null,
  note       text,                                   -- visible to the customer
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history (order_id);

-- owner-only notes (kept out of `orders` because customers can read their own order rows)
create table if not exists public.order_notes (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  body       text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- content
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  order_id    uuid not null references public.orders (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  rating      smallint not null check (rating between 1 and 5),
  title       text,
  body        text not null check (char_length(body) between 5 and 2000),
  status      review_status not null default 'pending',
  created_at  timestamptz not null default now(),
  unique (order_id, product_id)
);

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  email      text not null check (char_length(email) between 5 and 200),
  phone      text check (phone is null or char_length(phone) <= 40),
  message    text not null check (char_length(message) between 5 and 4000),
  status     message_status not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);
drop trigger if exists settings_updated on public.settings;
create trigger settings_updated before update on public.settings for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- security
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid references auth.users (id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- login throttling for /admin and the shop (only the server, with the secret key, touches this table)
create table if not exists public.login_attempts (
  id         bigint generated always as identity primary key,
  scope      text not null check (scope in ('admin', 'shop')),
  key        text not null,                          -- e.g. hashed IP + email
  success    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_lookup_idx on public.login_attempts (scope, key, created_at desc);
