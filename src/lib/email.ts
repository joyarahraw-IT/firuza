import 'server-only';
import { contactEmail, orderConfirmationEmail, ownerOrderEmail, paymentLinkEmail, type Email, type EmailOrder } from './email-templates';
import { serviceClient } from './supabase/server';

/** true when Resend is configured (key + sender). Without it emails are logged to the console, never sent. */
export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
const ownerEmail = () => process.env.OWNER_EMAIL || 'contacto@example.com';

/** a***@gmail.com: enough to recognise the address in a log, not enough to leak it */
export const maskEmail = (a: string) => a.replace(/^(.).*(@.*)$/, '$1***$2');

/**
 * Sends one email through Resend and ALWAYS logs the outcome (never the key):
 *   [email] sent <template> to <masked> id=<resend id>
 *   [email] FAILED <template> to <masked> <error name/message>
 *   [email] NOT SENT <template> to <masked> (RESEND_API_KEY/EMAIL_FROM missing)
 * Resend answers 4xx/5xx with { name, message } and 200 with { id }: both are read, and a 200 without an id counts as a failure.
 * Returns the Resend id, or null when it was not sent (never throws, so mail can never fail an order).
 */
async function send(template: string, to: string, mail: Email): Promise<string | null> {
  const who = `${template} to ${maskEmail(to)}`;
  if (!emailConfigured()) {
    console.warn(`[email] NOT SENT ${who} (RESEND_API_KEY/EMAIL_FROM missing) subject="${mail.subject}"`);
    return null;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject: mail.subject, html: mail.html }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string; message?: string };
    if (!res.ok || !body.id) {
      console.error(`[email] FAILED ${who} http=${res.status} ${body.name ?? 'no_id'}: ${body.message ?? 'Resend answered without an id'}`);
      return null;
    }
    console.log(`[email] sent ${who} id=${body.id}`);
    return body.id;
  } catch (e) {
    console.error(`[email] FAILED ${who} ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
    return null;
  }
}

async function loadOrder(number: string): Promise<EmailOrder | null> {
  const { data, error } = await serviceClient().from('orders').select('*, order_items(*)').eq('number', number).single();
  if (error || !data) console.error(`[email] FAILED load order ${number}: ${error?.message ?? 'not found'}`);
  return (data as EmailOrder | null) ?? null;
}

export type SentIds = { customer: string | null; owner: string | null };

/**
 * Confirmation to the customer + notification to the owner, sent independently (one failing never stops the other).
 * Reads the order back with the secret key, never from browser data. The order is already saved, so this never throws.
 * Paid emails are sent from the Stripe webhook right after `markPaid` flipped the order, so a paid order is emailed once;
 * `resendOrderEmails` (admin button / tools/resend-order-emails.mjs) is the deliberate way to send them again.
 */
export async function sendOrderEmailsDetailed(number: string, { paid = false }: { paid?: boolean } = {}): Promise<SentIds> {
  console.log(`[email] order emails start ${number} paid=${paid} configured=${emailConfigured()}`);
  const o = await loadOrder(number);
  if (!o) return { customer: null, owner: null };
  const [customer, owner] = await Promise.all([
    send(paid ? 'order-paid-customer' : 'order-received-customer', o.contact_email, orderConfirmationEmail(o, { paid })),
    send(paid ? 'order-paid-owner' : 'order-received-owner', ownerEmail(), ownerOrderEmail(o, { paid })),
  ]);
  return { customer, owner };
}

/** true only when both emails were handed to Resend */
export async function sendOrderEmails(number: string, opts: { paid?: boolean } = {}): Promise<boolean> {
  const r = await sendOrderEmailsDetailed(number, opts);
  return !!r.customer && !!r.owner;
}

/** Tells the customer about the payment link the owner just created. */
export async function sendPaymentLinkEmail(number: string, url: string): Promise<boolean> {
  const o = await loadOrder(number);
  if (!o) return false;
  return !!(await send('payment-link-customer', o.contact_email, paymentLinkEmail(o, url)));
}

/** Tells the owner about a new message from the contact form. */
export async function sendContactNotification(m: { name: string; email: string; phone?: string | null; message: string }): Promise<boolean> {
  return !!(await send('contact-owner', ownerEmail(), contactEmail(m)));
}
