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
