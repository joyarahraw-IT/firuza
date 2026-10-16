import 'server-only';
import { sendOrderEmails } from './email';
import type { OrderRow, WebhookStore } from './stripe-webhook';
import { serviceClient } from './supabase/server';

/** Supabase-backed store for the webhook (service role: bypasses RLS). */
export const supabaseStore: WebhookStore = {
  async claimEvent(id, type) {
    const { error } = await serviceClient().from('stripe_events').insert({ id, type });
    if (!error) return true;
    if (error.code === '23505') return false; // already processed
    throw new Error(error.message);
  },
  async releaseEvent(id) {
    await serviceClient().from('stripe_events').delete().eq('id', id);
  },
  async getOrder(id) {
    const { data } = await serviceClient().from('orders').select('id, number, status, payment_status, total_cents').eq('id', id).maybeSingle();
    return (data as OrderRow | null) ?? null;
  },
  async markPaid(orderId, p) {
    const db = serviceClient();
    const { data: cur } = await db.from('orders').select('status').eq('id', orderId).single();
    const advance = ['pendiente_pago', 'nuevo', 'confirmado'].includes(cur?.status ?? '');
    const { data, error } = await db.from('orders')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString(), stripe_session_id: p.sessionId, stripe_payment_intent_id: p.paymentIntentId, payment_method: 'Stripe', ...(advance ? { status: 'pagado' } : {}) })
      .eq('id', orderId).eq('payment_status', 'unpaid').select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) return false;
    // the status trigger just added a history row; give it a customer-visible note
    const { data: h } = await db.from('order_status_history').select('id').eq('order_id', orderId).order('created_at', { ascending: false }).limit(1);
    if (advance && h?.[0]) await db.from('order_status_history').update({ note: 'Pago recibido. ¡Gracias!' }).eq('id', h[0].id);
    return true;
  },
};

export const emailPaid = (number: string) => sendOrderEmails(number, { paid: true });
