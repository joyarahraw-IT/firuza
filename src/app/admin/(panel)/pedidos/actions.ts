'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { audit, requireAdmin } from '@/lib/admin';
import { ORDER_STATUSES } from '@/lib/admin-orders';
import { sendOrderEmailsDetailed, sendPaymentLinkEmail } from '@/lib/email';
import { createCheckoutSession } from '@/lib/stripe';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const back = (number: string, msg: string) => {
  revalidatePath(`/admin/pedidos/${number}`);
  redirect(`/admin/pedidos/${number}?ok=${msg}`);
};
const orderIdOf = async (number: string) => {
  const { db } = await requireAdmin();
  const { data } = await db.from('orders').select('id').eq('number', number).single();
  if (!data) redirect('/admin/pedidos');
  return { db, id: data.id as string };
};

export async function changeStatus(f: FormData) {
  const number = s(f, 'number');
  const status = s(f, 'status');
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return back(number, 'error');
  const { db, id } = await orderIdOf(number);
  const { error } = await db.rpc('admin_set_order_status', { p_order: id, p_status: status, p_note: s(f, 'note') || null });
  if (error) return back(number, 'error');
  await audit('order_status', 'order', number, { status, note: s(f, 'note') || undefined });
  back(number, 'estado');
}

export async function saveOrderFields(f: FormData) {
  const number = s(f, 'number');
  const { db, id } = await orderIdOf(number);
  const due = s(f, 'due_date');
  const patch = { due_date: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null, tracking_number: s(f, 'tracking_number') || null, payment_method: s(f, 'payment_method') || null };
  const { error } = await db.from('orders').update(patch).eq('id', id);
  if (error) return back(number, 'error');
  await audit('order_fields', 'order', number, patch);
  back(number, 'datos');
}

export async function addOrderNote(f: FormData) {
  const number = s(f, 'number');
  const body = s(f, 'body');
  if (body.length < 2 || body.length > 2000) return back(number, 'error');
  const { db, id } = await orderIdOf(number);
  const { data: u } = await db.auth.getUser();
  await db.from('order_notes').insert({ order_id: id, body, created_by: u.user?.id });
  await audit('order_note', 'order', number);
  back(number, 'nota');
}

/**
 * Rugs/kilims and "a consultar" destinations: after agreeing the shipping with the customer, the owner creates a Stripe Checkout link
 * for the confirmed total. The shipping she types is saved on the order (the webhook checks the paid amount against it).
 */
export async function createPaymentLink(f: FormData) {
  const number = s(f, 'number');
  const shipping = Math.round(Number(s(f, 'shipping').replace(',', '.')) * 100);
  if (!Number.isFinite(shipping) || shipping < 0 || shipping > 100000) return back(number, 'error');
  const { db, id } = await orderIdOf(number);
  const { data: o } = await db.from('orders').select('subtotal_cents, payment_status, status').eq('id', id).single();
  if (!o || o.payment_status === 'paid' || o.status === 'cancelado') return back(number, 'error');
  let linkUrl = '';
  try {
    const { error } = await db.from('orders').update({ shipping_cents: shipping, total_cents: o.subtotal_cents + shipping, shipping_to_confirm: false }).eq('id', id);
    if (error) throw new Error(error.message);
    const { url } = await createCheckoutSession(id);
    linkUrl = url;
    await db.from('orders').update({ payment_link_url: url }).eq('id', id);
  } catch (e) {
    console.error('[createPaymentLink]', e instanceof Error ? e.message : e);
    return back(number, 'errorpago');
  }
  await audit('order_payment_link', 'order', number, { shipping_cents: shipping });
  await sendPaymentLinkEmail(number, linkUrl);
  back(number, 'enlace');
}

/** Sends the paid-order emails (customer confirmation + owner notice) again for an order that is already paid. Admin only. */
export async function resendPaidEmails(f: FormData) {
  const number = s(f, 'number');
  const { db, id } = await orderIdOf(number);
  const { data: o } = await db.from('orders').select('payment_status').eq('id', id).single();
  if (o?.payment_status !== 'paid') return back(number, 'error');
  const r = await sendOrderEmailsDetailed(number, { paid: true });
  await audit('order_resend_paid_emails', 'order', number, { customer: !!r.customer, owner: !!r.owner });
  back(number, r.customer && r.owner ? 'emails' : 'erroremails');
}
