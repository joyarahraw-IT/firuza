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
