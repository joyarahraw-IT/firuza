-- Firuza rebrand: new order prefix and brand name. Safe to run more than once.
-- Does NOT touch existing orders (their numbers keep the old HV- prefix).
update public.settings set value = '"FZ"'      where key = 'order_prefix';
update public.settings set value = '"Firuza"'  where key = 'brand';
