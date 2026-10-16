-- Firuza · 0010 online payments (Stripe). Idempotent: safe to run more than once. NOT applied yet: review first.
-- Run this script on its own: a new enum value cannot be used in the same transaction that adds it.

-- 1) new order status: waiting for the online payment (set by the server right after create_order() for orders that can be paid online)
alter type order_status add value if not exists 'pendiente_pago' before 'nuevo';

-- 2) payment columns on orders
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists stripe_session_id text;          -- Checkout Session that was paid (or the last one created)
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists payment_link_url text;           -- link created by the owner for rugs / orders "a consultar"
do $$ begin
  alter table public.orders add constraint orders_payment_status_chk check (payment_status in ('unpaid', 'paid'));
exception when duplicate_object then null; end $$;
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create unique index if not exists orders_stripe_session_uidx on public.orders (stripe_session_id) where stripe_session_id is not null;

-- 3) processed Stripe events (webhook idempotency). Server only: RLS on, no policies, no grants for anon/authenticated.
create table if not exists public.stripe_events (
  id          text primary key,            -- evt_...
  type        text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;
grant all on public.stripe_events to service_role;

-- Note: customers can already read their own order rows (RLS), so they also see payment_status / payment_link_url of THEIR orders only.
-- Orders placed before this script keep payment_status = 'unpaid' (the owner agreed those payments by Bizum/transfer).
