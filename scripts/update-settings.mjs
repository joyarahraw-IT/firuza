// One-off: applies the 2026-10-05 decisions to the LIVE settings table (order prefix HV, new announcement text).
// node --env-file=.env.local scripts/update-settings.mjs
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = (process.env.SUPABASE_SECRET_KEY ?? '').trim();
if (!url || !secret) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY'); process.exitCode = 1; }
else {
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows = [
    { key: 'order_prefix', value: 'FZ', is_public: false },
    { key: 'announcement', value: 'Envío a toda la UE · Pagas al confirmar tu pedido · Piezas hechas a mano', is_public: true },
  ];
  const { error } = await db.from('settings').upsert(rows, { onConflict: 'key' });
  if (error) { console.error('Failed:', error.message); process.exitCode = 1; } else console.log('Settings updated: order_prefix=HV, announcement text.');
}
