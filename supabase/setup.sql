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
-- Firuza · 0002 functions and triggers

-- True only for a listed admin whose session passed TOTP (AAL2), unless mfa_required was switched off for that admin.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
      and (not a.mfa_required or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
  );
$$;

-- a customers row for every new auth user
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- status timeline: first entry on creation, then one per status change
create or replace function public.log_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, status) values (new.id, new.status);
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, created_by) values (new.id, new.status, auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists orders_status_log on public.orders;
create trigger orders_status_log after insert or update of status on public.orders for each row execute function public.log_order_status();

-- Mon–Fri only (public holidays are ignored)
create or replace function public.add_business_days(d date, n int) returns date
language plpgsql immutable as $$
declare r date := d; left_days int := n;
begin
  while left_days > 0 loop
    r := r + 1;
    if extract(isodow from r) < 6 then left_days := left_days - 1; end if;
  end loop;
  return r;
end $$;

create or replace function public.new_order_number() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- no 0/O/1/I
  suffix text := '';
  prefix text;
begin
  select coalesce(value #>> '{}', 'FZ') into prefix from public.settings where key = 'order_prefix';
  for i in 1..4 loop
    suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return coalesce(prefix, 'FZ') || '-' || to_char(now() at time zone 'Europe/Madrid', 'YYMMDD') || '-' || suffix;
end $$;

-- The ONLY way to create an order. Prices come from the database, never from the browser.
-- p_items   [{ "variant_id": uuid, "qty": 1..10 }]
-- p_contact { name, email, phone }
-- p_address { line1, line2?, postal_code, city, province?, country }
create or replace function public.create_order(p_items jsonb, p_contact jsonb, p_address jsonb, p_notes text, p_accept boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order_id  uuid := gen_random_uuid();
  v_number    text;
  v_name      text := btrim(coalesce(p_contact ->> 'name', ''));
  v_email     text := lower(btrim(coalesce(p_contact ->> 'email', '')));
  v_phone     text := btrim(coalesce(p_contact ->> 'phone', ''));
  v_country   text := upper(coalesce(nullif(btrim(p_address ->> 'country'), ''), 'ES'));
  v_postal    text := btrim(coalesce(p_address ->> 'postal_code', ''));
  v_ship      jsonb;
  v_ship_min  int;
  v_ship_max  int;
  v_today     date := (now() at time zone 'Europe/Madrid')::date;
  v_from      date := v_today;
  v_to        date := v_today;
  v_subtotal  int := 0;
  v_item      jsonb;
  v_qty       int;
  r           record;
  v_item_from date;
  v_item_to   date;
  v_customer  uuid;
begin
  if not coalesce(p_accept, false) then raise exception 'terms_not_accepted' using errcode = '22023'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'empty_or_invalid_bag' using errcode = '22023';
  end if;
  if char_length(v_name) < 2 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_phone) < 6 then
    raise exception 'invalid_contact' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_address ->> 'line1', ''))) < 3 or char_length(v_postal) < 3
     or char_length(btrim(coalesce(p_address ->> 'city', ''))) < 2 then
    raise exception 'invalid_address' using errcode = '22023';
  end if;

  -- shipping time: mainland Spain vs rest of the EU (islands, Ceuta and Melilla count as "rest")
  select value into v_ship from public.settings where key = 'shipping';
  if v_country = 'ES' and left(v_postal, 2) not in ('07', '35', '38', '51', '52') then
    v_ship_min := coalesce((v_ship ->> 'es_min')::int, 2);
    v_ship_max := coalesce((v_ship ->> 'es_max')::int, 4);
  else
    v_ship_min := coalesce((v_ship ->> 'eu_min')::int, 4);
    v_ship_max := coalesce((v_ship ->> 'eu_max')::int, 7);
  end if;

  if auth.uid() is not null and exists (select 1 from public.customers where id = auth.uid()) then
    v_customer := auth.uid();
  end if;

  loop
    v_number := public.new_order_number();
    exit when not exists (select 1 from public.orders where number = v_number);
  end loop;

  insert into public.orders (id, number, customer_id, contact_name, contact_email, contact_phone, shipping_address, notes, accepted_terms_at)
  values (v_order_id, v_number, v_customer, v_name, v_email, v_phone,
          jsonb_build_object('line1', btrim(p_address ->> 'line1'), 'line2', nullif(btrim(coalesce(p_address ->> 'line2', '')), ''),
                             'postal_code', v_postal, 'city', btrim(p_address ->> 'city'),
                             'province', nullif(btrim(coalesce(p_address ->> 'province', '')), ''), 'country', v_country),
          nullif(btrim(coalesce(p_notes, '')), ''), now());

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::int;
    if v_qty is null or v_qty not between 1 and 10 then raise exception 'invalid_quantity' using errcode = '22023'; end if;

    select v.id as variant_id, v.options, v.price_cents, p.id as product_id, p.name, p.delivery_mode,
           p.making_days_min, p.making_days_max, p.shipping_days_min, p.shipping_days_max,
           (select i.storage_key from public.product_images i where i.product_id = p.id order by i.is_cover desc, i.sort_order limit 1) as image_key
      into r
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item ->> 'variant_id')::uuid and v.active and p.status = 'published';
    if not found then raise exception 'item_unavailable' using errcode = '22023'; end if;

    insert into public.order_items (order_id, product_id, variant_id, name, options, unit_price_cents, quantity, line_total_cents,
                                    delivery_mode, making_days_min, making_days_max, shipping_days_min, shipping_days_max, image_key)
    values (v_order_id, r.product_id, r.variant_id, r.name, r.options, r.price_cents, v_qty, r.price_cents * v_qty,
            r.delivery_mode, r.making_days_min, r.making_days_max, r.shipping_days_min, r.shipping_days_max, r.image_key);
    v_subtotal := v_subtotal + r.price_cents * v_qty;

    if r.delivery_mode = 'made_to_order' then            -- making time + shipping, working days
      v_item_from := public.add_business_days(v_today, r.making_days_min + v_ship_min);
      v_item_to   := public.add_business_days(v_today, r.making_days_max + v_ship_max);
    else                                                  -- already woven: only the wait, calendar days
      v_item_from := v_today + r.shipping_days_min;
      v_item_to   := v_today + r.shipping_days_max;
    end if;
    v_from := greatest(v_from, v_item_from);
    v_to   := greatest(v_to, v_item_to);
  end loop;

  update public.orders
     set subtotal_cents = v_subtotal, total_cents = v_subtotal, estimated_from = v_from, estimated_to = v_to, due_date = v_to
   where id = v_order_id;

  return jsonb_build_object('number', v_number, 'total_cents', v_subtotal, 'estimated_from', v_from, 'estimated_to', v_to);
end $$;

revoke all on function public.create_order(jsonb, jsonb, jsonb, text, boolean) from public;
grant execute on function public.create_order(jsonb, jsonb, jsonb, text, boolean) to anon, authenticated;
-- Firuza · 0003 row level security
-- Rules: visitors read published catalogue only; customers see only their own data; only admins (listed in admin_users,
-- TOTP-verified) write products, orders and settings. Orders are created only through create_order().

alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.product_variants      enable row level security;
alter table public.product_images        enable row level security;
alter table public.customers             enable row level security;
alter table public.addresses             enable row level security;
alter table public.admin_users           enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_status_history  enable row level security;
alter table public.order_notes           enable row level security;
alter table public.reviews               enable row level security;
alter table public.contact_messages      enable row level security;
alter table public.settings              enable row level security;
alter table public.audit_log             enable row level security;
alter table public.login_attempts        enable row level security;   -- no policies: server (secret key) only

-- catalogue ------------------------------------------------------------
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to anon, authenticated using (true);
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products for select to anon, authenticated using (status = 'published' or public.is_admin());
drop policy if exists products_admin on public.products;
create policy products_admin on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants for select to anon, authenticated
  using (public.is_admin() or (active and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')));
drop policy if exists variants_admin on public.product_variants;
create policy variants_admin on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists images_read on public.product_images;
create policy images_read on public.product_images for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
drop policy if exists images_admin on public.product_images;
create policy images_admin on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- people ----------------------------------------------------------------
drop policy if exists customers_own_read on public.customers;
create policy customers_own_read on public.customers for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists customers_own_update on public.customers;
create policy customers_own_update on public.customers for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists addresses_own on public.addresses;
create policy addresses_own on public.addresses for all to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists addresses_admin_read on public.addresses;
create policy addresses_admin_read on public.addresses for select to authenticated using (public.is_admin());

-- an admin can only see their own row; nobody can write admin_users through the API
drop policy if exists admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users for select to authenticated using (user_id = auth.uid());

-- orders ----------------------------------------------------------------
drop policy if exists orders_own_read on public.orders;
create policy orders_own_read on public.orders for select to authenticated using (customer_id = auth.uid() or public.is_admin());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists orders_admin_delete on public.orders;
create policy orders_admin_delete on public.orders for delete to authenticated using (public.is_admin());

drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
drop policy if exists order_items_admin on public.order_items;
create policy order_items_admin on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_history_read on public.order_status_history;
create policy order_history_read on public.order_status_history for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
drop policy if exists order_history_admin on public.order_status_history;
create policy order_history_admin on public.order_status_history for insert to authenticated with check (public.is_admin());

drop policy if exists order_notes_admin on public.order_notes;
create policy order_notes_admin on public.order_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- reviews: only after the order was delivered, always moderated ----------
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select to anon, authenticated
  using (status = 'approved' or customer_id = auth.uid() or public.is_admin());
drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews for insert to authenticated
  with check (
    customer_id = auth.uid() and status = 'pending'
    and exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where o.id = reviews.order_id and o.customer_id = auth.uid() and o.status = 'entregado' and i.product_id = reviews.product_id)
  );
drop policy if exists reviews_admin on public.reviews;
create policy reviews_admin on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- contact form ----------------------------------------------------------
drop policy if exists contact_insert on public.contact_messages;
create policy contact_insert on public.contact_messages for insert to anon, authenticated with check (status = 'new');
drop policy if exists contact_admin on public.contact_messages;
create policy contact_admin on public.contact_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- settings: only rows flagged public are visible to visitors ---------------
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings for select to anon, authenticated using (is_public or public.is_admin());
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- audit log: admins read, and may only append rows under their own id; nobody edits history
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log for select to authenticated using (public.is_admin());
drop policy if exists audit_admin_append on public.audit_log;
create policy audit_admin_append on public.audit_log for insert to authenticated with check (public.is_admin() and admin_id = auth.uid());

-- storage: public bucket for product photos, written only by admins -------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
-- Firuza · 0004 categories and settings (everything editable later in /admin)

insert into public.categories (slug, name, blurb, sort_order) values
  ('tejidos-crochet', 'Tejidos y crochet', 'Crochet y macramé hechos a mano.', 1),
  ('collares',        'Collares',          'Collares de cuentas, perlas y cristal.', 2),
  ('pulseras',        'Pulseras',          'Pulseras de cuentas y perlas.', 3),
  ('pendientes',      'Pendientes',        'Pendientes de cuentas, por pares.', 4),
  ('alfombras-kilims','Alfombras y kilims','Alfombras y kilims ya tejidos.', 5)
on conflict (slug) do nothing;

insert into public.settings (key, value, is_public) values
  ('brand',        '"Firuza"', true),
  ('announcement', '"Envío a toda la UE · Pagas al confirmar tu pedido · Piezas hechas a mano"', true),
  ('contact',      '{"email":"contacto@example.com","whatsapp":"34600000000","instagram":null}', true),
  ('shipping',     '{"es_min":2,"es_max":4,"eu_min":4,"eu_max":7,"text":"Las piezas hechas bajo pedido se envían en cuanto están terminadas. Plazo de envío: 2–4 días laborables en España peninsular y 4–7 días en el resto de la UE."}', true),
  ('rug_shipping', '{"min":15,"max":30,"text":"Las alfombras y kilims ya están tejidos: solo tienes que esperar a que lleguen (15–30 días)."}', true),
  ('payment',      '{"methods":["Bizum","Transferencia bancaria"],"text":"No pagas nada al enviar el pedido. Lo confirmamos por WhatsApp o email y acordamos el pago contigo. [CONFIRMAR métodos]"}', true),
  ('owner',        '{"name":"Nombre Apellido","show_age":false}', true),
  ('legal_identity','{"name":"Nombre Apellido","nie":"[NIE]","email":"contacto@example.com","address":"[CONFIRMAR domicilio]"}', true),
  ('rug_industrial', '{"sizes":["2 × 3 m","2,5 × 3,5 m","3 × 4 m","3 × 5 m","4 × 6 m","Otra medida (hasta 24 m²)"],"max_m2":24,"note":"Se fabrica a medida, desde 2 × 3 m hasta 24 m². Te enviamos el precio por WhatsApp antes de empezar."}', true),
  ('order_prefix', '"FZ"', false),
  ('show_vat',     'false', true)
on conflict (key) do nothing;
-- Firuza · 0005 table privileges
-- New Supabase projects do NOT grant privileges on new public tables automatically. Without these GRANTs the API answers
-- "permission denied for table ..." before row level security is even consulted. RLS (0003) remains the real gate: the grants
-- below are only the MINIMUM each role needs, matching the policies. Safe to run more than once.

grant usage on schema public to anon, authenticated, service_role;

-- service_role (the secret key) bypasses RLS and may do everything --------------------------------------------------
grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- start from nothing for the browser-facing roles, then add exactly what is needed --------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- catalogue: everyone reads, admins write (RLS decides who is an admin)
grant select on public.categories, public.products, public.product_variants, public.product_images to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants, public.product_images to authenticated;

-- customers: read own row, edit only name and phone (rows are created by the signup trigger)
grant select on public.customers to authenticated;
grant update (full_name, phone) on public.customers to authenticated;

grant select, insert, update, delete on public.addresses to authenticated;

-- admin_users: an admin can read their own row; nobody writes it through the API
grant select on public.admin_users to authenticated;

-- orders: no direct inserts by anyone (create_order() does it). Customers read their own; admins update/delete.
grant select, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert on public.order_status_history to authenticated;
grant select, insert, update, delete on public.order_notes to authenticated;

grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;

grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;

grant select, insert on public.audit_log to authenticated;

-- login_attempts: nothing for anon/authenticated (service_role only; already revoked above)

-- functions ---------------------------------------------------------------------------------------------------------------
-- is_admin() is evaluated inside the RLS policies, so every role that queries those tables must be able to run it
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.create_order(jsonb, jsonb, jsonb, text, boolean) to anon, authenticated, service_role;

-- future objects created by the SQL Editor role (postgres): service_role gets everything automatically.
-- anon/authenticated deliberately get NOTHING by default: every new table needs an explicit, minimal GRANT plus RLS policies.
alter default privileges for role postgres in schema public grant all on tables    to service_role;
alter default privileges for role postgres in schema public grant all on sequences to service_role;
alter default privileges for role postgres in schema public grant all on functions to service_role;
-- Firuza · 0006 shipping costs (read from settings on the SERVER, never from the browser)
-- Zones (by country + postal code):
--   madrid  : Comunidad de Madrid (28xxx)        -> madrid_cents  (default 0 = free)
--   spain   : rest of mainland Spain             -> spain_cents   (default 4,90 €)
--   eu      : rest of the EU                     -> eu_cents      (default 9,90 €)
--   consult : Baleares, Canarias, Ceuta, Melilla -> "envío a consultar" (not charged automatically)
-- Rugs and kilims never get the free/priced shipping: their cost is confirmed with the customer before paying.
-- One fee per order, only if it contains at least one non-rug item. Safe to run more than once.

alter table public.orders add column if not exists shipping_zone       text;
alter table public.orders add column if not exists shipping_to_confirm boolean not null default false;

insert into public.settings (key, value, is_public) values
  ('shipping_rates',
   '{"madrid_cents":0,"spain_cents":490,"eu_cents":990,"consult_label":"Envío a consultar","rug_label":"Gastos de envío según tamaño: te los confirmamos antes de pagar"}',
   true),
  ('rug_texts',
   '{"silk_note":"Estas medidas y precios corresponden a la alfombra de seda anudada a mano."}',
   true)
on conflict (key) do nothing;

create or replace function public.shipping_zone(p_country text, p_postal text) returns text
language sql immutable as $$
  select case
    when upper(p_country) <> 'ES' then 'eu'
    when left(regexp_replace(p_postal, '\s', '', 'g'), 2) = '28' then 'madrid'
    when left(regexp_replace(p_postal, '\s', '', 'g'), 2) in ('07', '35', '38', '51', '52') then 'consult'
    else 'spain'
  end;
$$;

-- same as 0002 plus shipping cost, zone, and the EU country whitelist
create or replace function public.create_order(p_items jsonb, p_contact jsonb, p_address jsonb, p_notes text, p_accept boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order_id  uuid := gen_random_uuid();
  v_number    text;
  v_name      text := btrim(coalesce(p_contact ->> 'name', ''));
  v_email     text := lower(btrim(coalesce(p_contact ->> 'email', '')));
  v_phone     text := btrim(coalesce(p_contact ->> 'phone', ''));
  v_country   text := upper(coalesce(nullif(btrim(p_address ->> 'country'), ''), 'ES'));
  v_postal    text := btrim(coalesce(p_address ->> 'postal_code', ''));
  v_ship      jsonb;
  v_rates     jsonb;
  v_zone      text;
  v_ship_min  int;
  v_ship_max  int;
  v_today     date := (now() at time zone 'Europe/Madrid')::date;
  v_from      date := v_today;
  v_to        date := v_today;
  v_subtotal  int := 0;
  v_regular   boolean := false;
  v_rug       boolean := false;
  v_fee       int := 0;
  v_confirm   boolean := false;
  v_item      jsonb;
  v_qty       int;
  r           record;
  v_item_from date;
  v_item_to   date;
  v_customer  uuid;
begin
  if not coalesce(p_accept, false) then raise exception 'terms_not_accepted' using errcode = '22023'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'empty_or_invalid_bag' using errcode = '22023';
  end if;
  if char_length(v_name) < 2 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_phone) < 6 then
    raise exception 'invalid_contact' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_address ->> 'line1', ''))) < 3 or char_length(v_postal) < 3
     or char_length(btrim(coalesce(p_address ->> 'city', ''))) < 2
     or v_country not in ('AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE') then
    raise exception 'invalid_address' using errcode = '22023';
  end if;

  v_zone := public.shipping_zone(v_country, v_postal);

  -- delivery time: mainland Spain vs rest of the EU (islands, Ceuta and Melilla count as "rest")
  select value into v_ship from public.settings where key = 'shipping';
  if v_zone in ('madrid', 'spain') then
    v_ship_min := coalesce((v_ship ->> 'es_min')::int, 2);
    v_ship_max := coalesce((v_ship ->> 'es_max')::int, 4);
  else
    v_ship_min := coalesce((v_ship ->> 'eu_min')::int, 4);
    v_ship_max := coalesce((v_ship ->> 'eu_max')::int, 7);
  end if;

  if auth.uid() is not null and exists (select 1 from public.customers where id = auth.uid()) then
    v_customer := auth.uid();
  end if;

  loop
    v_number := public.new_order_number();
    exit when not exists (select 1 from public.orders where number = v_number);
  end loop;

  insert into public.orders (id, number, customer_id, contact_name, contact_email, contact_phone, shipping_address, notes, accepted_terms_at)
  values (v_order_id, v_number, v_customer, v_name, v_email, v_phone,
          jsonb_build_object('line1', btrim(p_address ->> 'line1'), 'line2', nullif(btrim(coalesce(p_address ->> 'line2', '')), ''),
                             'postal_code', v_postal, 'city', btrim(p_address ->> 'city'),
                             'province', nullif(btrim(coalesce(p_address ->> 'province', '')), ''), 'country', v_country),
          nullif(btrim(coalesce(p_notes, '')), ''), now());

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::int;
    if v_qty is null or v_qty not between 1 and 10 then raise exception 'invalid_quantity' using errcode = '22023'; end if;

    select v.id as variant_id, v.options, v.price_cents, p.id as product_id, p.name, p.delivery_mode,
           p.making_days_min, p.making_days_max, p.shipping_days_min, p.shipping_days_max,
           (select i.storage_key from public.product_images i where i.product_id = p.id order by i.is_cover desc, i.sort_order limit 1) as image_key
      into r
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item ->> 'variant_id')::uuid and v.active and p.status = 'published';
    if not found then raise exception 'item_unavailable' using errcode = '22023'; end if;

    insert into public.order_items (order_id, product_id, variant_id, name, options, unit_price_cents, quantity, line_total_cents,
                                    delivery_mode, making_days_min, making_days_max, shipping_days_min, shipping_days_max, image_key)
    values (v_order_id, r.product_id, r.variant_id, r.name, r.options, r.price_cents, v_qty, r.price_cents * v_qty,
            r.delivery_mode, r.making_days_min, r.making_days_max, r.shipping_days_min, r.shipping_days_max, r.image_key);
    v_subtotal := v_subtotal + r.price_cents * v_qty;

    if r.delivery_mode = 'made_to_order' then
      v_regular := true;
      v_item_from := public.add_business_days(v_today, r.making_days_min + v_ship_min);
      v_item_to   := public.add_business_days(v_today, r.making_days_max + v_ship_max);
    else
      v_rug := true;
      v_item_from := v_today + r.shipping_days_min;
      v_item_to   := v_today + r.shipping_days_max;
    end if;
    v_from := greatest(v_from, v_item_from);
    v_to   := greatest(v_to, v_item_to);
  end loop;

  -- shipping: from settings, on the server. One fee per order, only for non-rug items.
  select value into v_rates from public.settings where key = 'shipping_rates';
  v_confirm := v_rug or v_zone = 'consult';
  if v_regular and v_zone <> 'consult' then
    v_fee := case v_zone
      when 'madrid' then coalesce((v_rates ->> 'madrid_cents')::int, 0)
      when 'spain'  then coalesce((v_rates ->> 'spain_cents')::int, 490)
      else               coalesce((v_rates ->> 'eu_cents')::int, 990)
    end;
  end if;

  update public.orders
     set subtotal_cents = v_subtotal, shipping_cents = v_fee, total_cents = v_subtotal + v_fee,
         shipping_zone = v_zone, shipping_to_confirm = v_confirm,
         estimated_from = v_from, estimated_to = v_to, due_date = v_to
   where id = v_order_id;

  return jsonb_build_object('number', v_number, 'subtotal_cents', v_subtotal, 'shipping_cents', v_fee, 'total_cents', v_subtotal + v_fee,
                            'shipping_zone', v_zone, 'shipping_to_confirm', v_confirm,
                            'estimated_from', v_from, 'estimated_to', v_to);
end $$;

revoke all on function public.create_order(jsonb, jsonb, jsonb, text, boolean) from public;
grant execute on function public.create_order(jsonb, jsonb, jsonb, text, boolean) to anon, authenticated, service_role;
grant execute on function public.shipping_zone(text, text) to anon, authenticated, service_role;
-- Firuza · 0007 admin helpers. Safe to run more than once.

-- Change an order's status and attach the (customer-visible) note to the timeline entry the trigger just created.
-- Atomic, and only for a TOTP-verified admin (is_admin()).
create or replace function public.admin_set_order_status(p_order uuid, p_status order_status, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.orders set status = p_status where id = p_order and status is distinct from p_status;
  if found and nullif(btrim(coalesce(p_note, '')), '') is not null then
    update public.order_status_history
       set note = btrim(p_note)
     where id = (select id from public.order_status_history where order_id = p_order order by created_at desc limit 1);
  end if;
end $$;

revoke all on function public.admin_set_order_status(uuid, order_status, text) from public;
grant execute on function public.admin_set_order_status(uuid, order_status, text) to authenticated, service_role;
-- Firuza · 0008 reviews show the customer's first name. Safe to run more than once.
alter table public.reviews add column if not exists author_name text check (author_name is null or char_length(author_name) <= 60);
