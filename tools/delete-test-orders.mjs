// One-off: deletes ONLY the four Stripe test orders created during the Phase 5 live test (and the test webhook events).
// Run: node --env-file=.env.local tools/delete-test-orders.mjs   (delete this file afterwards)
import { createClient } from '@supabase/supabase-js';

const NUMBERS = ['FZ-261012-XVT8', 'FZ-261012-7CPX', 'FZ-261012-WD56', 'FZ-261012-26K3'];
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const { data: found } = await db.from('orders').select('number, contact_email').in('number', NUMBERS);
const bad = (found ?? []).filter((o) => !o.contact_email.endsWith('@example.com'));
if (bad.length) { console.error('Refusing: not a test order', bad.map((o) => o.number)); process.exit(1); }

const { data: del, error } = await db.from('orders').delete().in('number', NUMBERS).select('number');
if (error) { console.error(error.message); process.exit(1); }
console.log('deleted orders:', del.map((o) => o.number));
const { error: e2 } = await db.from('stripe_events').delete().neq('id', '');
console.log(e2 ? e2.message : 'stripe_events cleared');
const { count } = await db.from('orders').select('id', { count: 'exact', head: true });
console.log('orders left:', count);
