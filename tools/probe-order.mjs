import { createClient } from '@supabase/supabase-js';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data, error } = await db.from('orders').select('*, order_items(*)').eq('number', process.argv[2]).single();
console.log('error:', error?.message ?? null, '| found:', !!data, '| items:', data?.order_items?.length, '| keys has shipping_address:', !!data?.shipping_address, 'contact_email:', data?.contact_email);
