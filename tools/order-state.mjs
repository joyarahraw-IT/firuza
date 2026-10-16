// node --env-file=.env.local tools/order-state.mjs FZ-... : prints status of an order + latest stripe_events (no secrets)
import { createClient } from '@supabase/supabase-js';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const n = process.argv[2];
const { data: o } = await db.from('orders').select('number,status,payment_status,paid_at,total_cents,contact_email,stripe_session_id').eq('number', n).single();
console.log(JSON.stringify(o));
const { data: e } = await db.from('stripe_events').select('*').order('received_at', { ascending: false }).limit(5);
console.log('stripe_events:', JSON.stringify(e));
const { data: h } = await db.from('order_status_history').select('status,note,created_at').eq('order_id', (await db.from('orders').select('id').eq('number', n).single()).data.id).order('created_at');
console.log('history:', JSON.stringify(h));
