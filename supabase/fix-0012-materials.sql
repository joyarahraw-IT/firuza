-- fix-0012-materials.sql — REVIEW BEFORE APPLYING (Supabase SQL Editor). Idempotent. Run after fix-0011-specs.sql.
-- 1) products.materials: the REAL materials of each piece, entered by the owner in admin → product → "Materiales".
--    { "stones": [{"name":"Ágata roja","natural":true}],
--      "metal": "Plata 925 | Baño de oro | Acero inoxidable | Latón",
--      "thread": "Hilo de nailon | Cable de acero | Elástico",
--      "fibers": [{"fiber":"Algodón","pct":100}],      -- total must be 100 (EU Regulation 1007/2011), checked by the admin form
--      "care": "free text, optional" }
--    Nothing is pre-filled: the site shows only what has been entered.
-- 2) product_images.kind: 'studio' (plain background), 'in_hand' or 'worn'.

alter table public.products add column if not exists materials jsonb not null default '{}';

alter table public.product_images add column if not exists kind text not null default 'studio';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_images_kind_check') then
    alter table public.product_images add constraint product_images_kind_check check (kind in ('studio', 'in_hand', 'worn'));
  end if;
end $$;
