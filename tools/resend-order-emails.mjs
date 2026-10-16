// Re-sends the PAID order emails (customer + owner) for one order. node --env-file=.env.local tools/resend-order-emails.mjs FZ-...
// Same templates and same log format as src/lib/email.ts. Never prints the key.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
const T = await import(pathToFileURL(fileURLToPath(new URL('../src/lib/email-templates.ts', import.meta.url))).href);
const number = process.argv[2];
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: o, error } = await db.from('orders').select('*, order_items(*)').eq('number', number).single();
if (error || !o) { console.error('[email] FAILED load order', number, error?.message); process.exit(1); }
if (o.payment_status !== 'paid') { console.error('order is not paid'); process.exit(1); }
const mask = (a) => a.replace(/^(.).*(@.*)$/, '$1***$2');
async function send(template, to, mail) {
  const who = `${template} to ${mask(to)}`;
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject: mail.subject, html: mail.html }) });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.id) console.error(`[email] FAILED ${who} http=${res.status} ${b.name ?? 'no_id'}: ${b.message ?? ''}`);
  else console.log(`[email] sent ${who} id=${b.id}`);
}
await send('order-paid-customer', o.contact_email, T.orderConfirmationEmail(o, { paid: true }));
await send('order-paid-owner', process.env.OWNER_EMAIL, T.ownerOrderEmail(o, { paid: true }));
