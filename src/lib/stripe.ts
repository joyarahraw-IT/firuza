import 'server-only';
import Stripe from 'stripe';
import { buildCheckoutLines } from './payments';
import { BIZUM } from './pay-methods';
import { SITE_URL } from './site';
import { serviceClient } from './supabase/server';

export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

let client: Stripe | undefined;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set in .env.local');
  return (client ??= new Stripe(key));
}

type CheckoutOrder = {
  id: string; number: string; contact_email: string; subtotal_cents: number; shipping_cents: number; total_cents: number; payment_status: string;
  order_items: { name: string; options: Record<string, string> | null; unit_price_cents: number; quantity: number }[];
};

/**
 * Creates a hosted Checkout Session for a saved order (amounts read from the database, never from the browser).
 * Card (incl. Apple Pay / Google Pay) and Bizum, EUR, Spanish. Returns the URL to send the customer to.
 */
export async function createCheckoutSession(orderId: string): Promise<{ url: string; id: string }> {
  const db = serviceClient();
  const { data } = await db.from('orders').select('id, number, contact_email, subtotal_cents, shipping_cents, total_cents, payment_status, order_items(name, options, unit_price_cents, quantity)').eq('id', orderId).single();
  const o = data as CheckoutOrder | null;
  if (!o) throw new Error('order_not_found');
  if (o.payment_status === 'paid') throw new Error('already_paid');
  const { lines, totalCents } = buildCheckoutLines(o.order_items, o.shipping_cents);
  if (totalCents !== o.total_cents) throw new Error('total_mismatch'); // never charge something the order does not say
  const meta = { order_id: o.id, order_number: o.number };
  const n = encodeURIComponent(o.number);
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    locale: 'es',
    currency: 'eur',
    allowed_payment_method_types: BIZUM ? ['card', 'bizum'] : ['card'], // card covers Apple Pay / Google Pay; Bizum only once the account capability is active
    line_items: lines,
    customer_email: o.contact_email,
    client_reference_id: o.number,
    metadata: meta,
    payment_intent_data: { metadata: meta, description: `Pedido ${o.number} · Firuza` },
    success_url: `${SITE_URL}/pedido/confirmado?n=${n}&p=ok`,
    cancel_url: `${SITE_URL}/pedido/confirmado?n=${n}&p=cancel`,
  });
  if (!session.url) throw new Error('no_checkout_url');
  await db.from('orders').update({ stripe_session_id: session.id }).eq('id', o.id);
  return { url: session.url, id: session.id };
}
