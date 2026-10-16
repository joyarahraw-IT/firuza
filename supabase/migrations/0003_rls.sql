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
