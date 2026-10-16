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
