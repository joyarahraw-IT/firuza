'use server';
import { redirect } from 'next/navigation';
import { createCheckoutSession } from '@/lib/stripe';
import { serviceClient } from '@/lib/supabase/server';

/** "Pagar ahora" / "Reintentar el pago": opens a fresh Stripe Checkout Session for an unpaid order that is waiting for payment. */
export async function payOrder(f: FormData) {
  const number = String(f.get('number') ?? '');
  if (!/^[A-Z]{2}-\d{6}-[A-Z2-9]{4}$/.test(number)) redirect('/');
  const { data: o } = await serviceClient().from('orders').select('id, status, payment_status').eq('number', number).maybeSingle();
  if (!o || o.payment_status === 'paid' || o.status !== 'pendiente_pago') redirect(`/pedido/confirmado?n=${encodeURIComponent(number)}`);
  let url: string;
  try {
    url = (await createCheckoutSession(o.id)).url;
  } catch (e) {
    console.error('[payOrder]', e instanceof Error ? e.message : e);
    redirect(`/pedido/confirmado?n=${encodeURIComponent(number)}&p=error`);
  }
  redirect(url);
}
