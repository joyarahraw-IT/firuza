-- fix-0011-specs.sql — REVIEW BEFORE APPLYING (Supabase SQL Editor). Idempotent.
-- 1) products.specs: per-product measurements (length_cm, drop_cm, weight_g, width_cm, height_cm, depth_cm, strap_drop_cm, knots_dm2).
--    "provisional": true marks placeholder values the owner still has to confirm (shown as "provisional" on the site).
-- 2) settings 'size_guides' (public): one size guide per category (es-ES, cm).
-- 3) order_items.measurements + create_order(): "A medida" clothing keeps bust/waist/hip (cm) on the order line.
-- 4) settings 'legal_owner' (NOT public): titular, NIE, domicilio, email. Fill it in admin → Ajustes → Datos legales.
--    The old PUBLIC row 'legal_identity' is removed so the NIE is no longer readable through the public API.
-- 5) Zapatillas: sizes EU 36–41 (new variants copy the current price; old variants are deactivated, not deleted).

alter table public.products add column if not exists specs jsonb not null default '{}';

update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-azul-dorado' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":75,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-largo-azul-marino-flores' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-azul-dorado-perlas' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":75,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-largo-perlas-azules' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-perlas-verdes' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":40,"weight_g":90,"provisional":true}'::jsonb where slug = 'collar-babero-rojo-negro' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-granate-perlas' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-flecos-verde-oliva' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-rojo-cadena-dorada' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-azul-turquesa-negro' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-perlas-granate' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-perlas-cristal-verde' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-azul-cristal-negro' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":45,"weight_g":40,"provisional":true}'::jsonb where slug = 'collar-dorado-gotas-verdes' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":18,"weight_g":15,"provisional":true}'::jsonb where slug = 'pulsera-perlas-cuatro-modelos' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":18,"weight_g":15,"provisional":true}'::jsonb where slug = 'pulsera-perlas-azul-claro' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":18,"weight_g":15,"provisional":true}'::jsonb where slug = 'pulsera-ancha-ambar' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":18,"weight_g":15,"provisional":true}'::jsonb where slug = 'pulsera-flores-pastel' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":18,"weight_g":15,"provisional":true}'::jsonb where slug = 'pulsera-negra-amarilla' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":18,"weight_g":15,"provisional":true}'::jsonb where slug = 'pulsera-perlas-negro-dorado' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":18,"weight_g":15,"provisional":true}'::jsonb where slug = 'pulsera-perlas-rojo-blanco-cierre' and specs = '{}'::jsonb;
update public.products set specs = '{"length_cm":18,"weight_g":15,"provisional":true}'::jsonb where slug = 'pulsera-elastica-rojo-blanco' and specs = '{}'::jsonb;
update public.products set specs = '{"drop_cm":6,"weight_g":8,"provisional":true}'::jsonb where slug = 'pendientes-artesanales' and specs = '{}'::jsonb;
update public.products set specs = '{"drop_cm":14,"weight_g":8,"provisional":true}'::jsonb where slug = 'pendientes-largos-turquesa' and specs = '{}'::jsonb;
update public.products set specs = '{"width_cm":30,"height_cm":24,"depth_cm":12,"strap_drop_cm":25,"provisional":true}'::jsonb where slug = 'bolso-crochet-cuadros' and specs = '{}'::jsonb;
update public.products set specs = '{"width_cm":20,"height_cm":14,"depth_cm":2,"provisional":true}'::jsonb where slug = 'cartera-crochet' and specs = '{}'::jsonb;
update public.products set specs = '{"knots_dm2":1000,"provisional":true}'::jsonb where slug = 'alfombra-roja-geometrica' and specs = '{}'::jsonb;
update public.products set specs = '{"knots_dm2":1000,"provisional":true}'::jsonb where slug = 'alfombra-medallon-negro' and specs = '{}'::jsonb;
update public.products set specs = '{"knots_dm2":1000,"provisional":true}'::jsonb where slug = 'alfombra-tribal-rojo' and specs = '{}'::jsonb;

insert into public.settings (key, value, is_public) values ('size_guides', '{"collares":{"title":"Collares: largo","intro":"El largo se mide a lo largo del collar, de un extremo a otro del cierre. Elige el tipo según dónde quieres que caiga.","table":{"head":["Tipo","Largo","Dónde cae"],"rows":[["Gargantilla","35–40 cm","Ajustado al cuello"],["Princesa","43–48 cm","Sobre la clavícula"],["Matinée","50–60 cm","Entre la clavícula y el pecho"],["Ópera","70–90 cm","Sobre el pecho, hacia la cintura"],["Sautoir","90+ cm","Muy largo; se puede llevar doblado"]]},"diagram":"neckline","steps":null},"pulseras":{"title":"Pulseras: talla","intro":"Mide tu muñeca y elige la talla de la pulsera. Si estás entre dos tallas, elige la mayor para llevarla más suelta.","table":{"head":["Talla","Muñeca","Pulsera"],"rows":[["S","14–15 cm","16–17 cm"],["M","15–16,5 cm","17,5–18,5 cm"],["L","16,5–18 cm","19–20 cm"],["XL","18–19,5 cm","20,5–21,5 cm"]]},"stepsTitle":"Cómo medir tu muñeca","steps":["Corta una tira de papel de unos 1,5 cm de ancho y 25 cm de largo.","Rodea tu muñeca con la tira, justo donde llevarás la pulsera.","Marca con un lápiz el punto donde el papel se cruza.","Estira la tira y mide con una regla hasta la marca: esa es tu muñeca.","Busca tu medida en la tabla."]},"pendientes":{"title":"Pendientes: caída y peso","intro":"Cada pendiente indica en «Medidas» su caída (el largo desde el gancho hasta el final) y su peso. Los más largos pesan algo más.","table":null,"steps":null},"ropa":{"title":"Ropa de crochet: tallas","intro":"Tallas europeas de mujer, con las medidas del cuerpo en cm. Si estás entre dos tallas, elige la mayor.","table":{"head":["Talla","Busto","Cintura","Cadera"],"rows":[["XS (34)","80–84","62–66","88–92"],["S (36)","84–88","66–70","92–96"],["M (38)","88–92","70–74","96–100"],["L (40)","92–98","74–80","100–106"],["XL (42)","98–104","80–86","106–112"]]},"stepsTitle":"Cómo medirte","steps":["Busto: rodea la parte más ancha del pecho con la cinta, sin apretar.","Cintura: mide la parte más estrecha del torso.","Cadera: rodea la parte más ancha de las caderas.","Si ninguna talla te encaja, elige «A medida» y escribe tus tres medidas en cm (entre 60 y 150)."]},"zapatillas":{"title":"Zapatillas: talla","intro":"Tallas europeas con el largo del pie en cm.","table":{"head":["Talla EU","Largo del pie"],"rows":[["36","23 cm"],["37","23,5 cm"],["38","24 cm"],["39","25 cm"],["40","25,5 cm"],["41","26 cm"]]},"stepsTitle":"Cómo medir tu pie","steps":["Apoya el talón contra una pared, de pie sobre una hoja de papel.","Marca en el papel el punto del dedo más largo.","Mide con una regla del borde del papel a la marca y busca esa medida en la tabla."]},"bolsos":{"title":"Bolsos: medidas","intro":"Cada bolso indica en «Medidas» ancho × alto × fondo y la caída del asa.","table":null,"stepsTitle":"Cómo leer las medidas","steps":["Ancho: de lado a lado, en la parte más ancha.","Alto: del suelo a la parte superior, sin contar el asa.","Fondo: de delante a atrás, en la base.","Caída del asa: del punto más alto del asa, estirada, al borde superior del bolso."]},"alfombras":{"title":"Alfombras y kilims: medidas","intro":"Medidas habituales, ancho × largo en cm. Cada alfombra indica sus medidas exactas en su ficha.","table":{"head":["Medida"],"rows":[["60 × 90 cm"],["80 × 150 cm"],["120 × 170 cm"],["160 × 230 cm"],["200 × 300 cm"],["Pasillo 80 × 250 cm"]]},"steps":null}}'::jsonb, true)
on conflict (key) do update set value = excluded.value, is_public = true;

-- ------------------------------------------------------------------ legal owner (private)
insert into public.settings (key, value, is_public) values ('legal_owner', '{"name":"","nie":"","address":"","email":""}'::jsonb, false)
on conflict (key) do nothing;
update public.settings set is_public = false where key = 'legal_owner';
delete from public.settings where key = 'legal_identity';

-- ------------------------------------------------------------------ slippers EU 36-41
do $$
declare
  p record; v record; sz text; col text;
  sizes text[] := array['EU 36','EU 37','EU 38','EU 39','EU 40','EU 41'];
begin
  for p in select id from public.products where slug = 'zapatillas-crochet' loop
    update public.products set option_groups = (
      select jsonb_agg(case when g ->> 'name' = 'Talla' then jsonb_set(g, '{values}', to_jsonb(sizes)) else g end)
        from jsonb_array_elements(option_groups) g) where id = p.id;
    if not exists (select 1 from public.product_variants where product_id = p.id and options ->> 'Talla' = 'EU 36') then
      for col in select distinct options ->> 'Color' from public.product_variants where product_id = p.id loop
        select price_cents into v from public.product_variants where product_id = p.id and options ->> 'Color' = col and active order by sort_order limit 1;
        foreach sz in array sizes loop
          insert into public.product_variants (product_id, options, price_cents, active, sort_order)
          values (p.id, jsonb_build_object('Color', col, 'Talla', sz), v.price_cents, true, 100 + array_position(sizes, sz));
        end loop;
      end loop;
      update public.product_variants set active = false where product_id = p.id and options ->> 'Talla' not like 'EU %';
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------------ "A medida": measurements on the order line
alter table public.order_items add column if not exists measurements jsonb;

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
  v_meas      jsonb;
  v_opts      jsonb;
  v_bust      int;
  v_waist     int;
  v_hip       int;
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

    -- "A medida" clothing: bust / waist / hip in cm, each 60-150
    v_meas := null;
    if v_item ? 'measurements' and jsonb_typeof(v_item -> 'measurements') = 'object' then
      begin
        v_bust  := (v_item -> 'measurements' ->> 'bust_cm')::int;
        v_waist := (v_item -> 'measurements' ->> 'waist_cm')::int;
        v_hip   := (v_item -> 'measurements' ->> 'hip_cm')::int;
      exception when others then
        raise exception 'invalid_measurements' using errcode = '22023';
      end;
      if v_bust not between 60 and 150 or v_waist not between 60 and 150 or v_hip not between 60 and 150 then
        raise exception 'invalid_measurements' using errcode = '22023';
      end if;
      v_meas := jsonb_build_object('bust_cm', v_bust, 'waist_cm', v_waist, 'hip_cm', v_hip);
    end if;

    select v.id as variant_id, v.options, v.price_cents, p.id as product_id, p.name, p.delivery_mode,
           p.making_days_min, p.making_days_max, p.shipping_days_min, p.shipping_days_max,
           (select i.storage_key from public.product_images i where i.product_id = p.id order by i.is_cover desc, i.sort_order limit 1) as image_key
      into r
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item ->> 'variant_id')::uuid and v.active and p.status = 'published';
    if not found then raise exception 'item_unavailable' using errcode = '22023'; end if;

    -- "A medida" measurements are only accepted for crochet clothing
    if v_meas is not null and not exists (
         select 1 from public.products p2 join public.categories c2 on c2.id = p2.category_id
          where p2.id = r.product_id and c2.slug = 'tejidos-crochet') then
      raise exception 'invalid_measurements' using errcode = '22023';
    end if;

    -- the measurements are also written into options so every screen, email and CSV shows them
    v_opts := r.options;
    if v_meas is not null then
      v_opts := (v_opts - 'Talla') || jsonb_build_object('Talla', 'A medida: busto ' || v_bust || ' · cintura ' || v_waist || ' · cadera ' || v_hip || ' cm');
    end if;

    insert into public.order_items (order_id, product_id, variant_id, name, options, unit_price_cents, quantity, line_total_cents,
                                    delivery_mode, making_days_min, making_days_max, shipping_days_min, shipping_days_max, image_key, measurements)
    values (v_order_id, r.product_id, r.variant_id, r.name, v_opts, r.price_cents, v_qty, r.price_cents * v_qty,
            r.delivery_mode, r.making_days_min, r.making_days_max, r.shipping_days_min, r.shipping_days_max, r.image_key, v_meas);
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
