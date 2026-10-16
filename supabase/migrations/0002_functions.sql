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
