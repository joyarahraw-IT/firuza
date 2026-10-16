// One-off (idempotent): applies the rug decisions to the products already in the database.
//  - silk, hand-knotted description (2026-10-05)
//  - option "Tipo" (silk / industrial on request) on the 3 silk rugs; industrial is quote-only via WhatsApp
// node --env-file=.env.local scripts/update-rugs.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const secret = (process.env.SUPABASE_SECRET_KEY ?? '').trim();
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !secret) {
  console.error('Missing env');
  process.exitCode = 1;
} else {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const seed = JSON.parse(fs.readFileSync('data/seed/products.seed.json', 'utf8'));
  for (const slug of ['alfombra-roja-geometrica', 'alfombra-medallon-negro', 'alfombra-tribal-rojo']) {
    const p = seed.find((x) => x.slug === slug);
    const { data: row } = await db.from('products').select('id').eq('slug', slug).single();
    const u = await db.from('products').update({ description: p.description, care: p.care, option_groups: p.option_groups }).eq('id', row.id);
    await db.from('product_variants').delete().eq('product_id', row.id);
    const v = await db.from('product_variants').insert(p.variants.map((x, k) => ({ product_id: row.id, options: x.options, price_cents: x.price_cents, sort_order: k })));
    console.log(slug, u.error?.message ?? v.error?.message ?? 'updated (silk text, Tipo option, variants)');
  }
  const s = await db.from('settings').upsert(
    {
      key: 'rug_industrial',
      is_public: true,
      value: {
        sizes: ['2 × 3 m', '2,5 × 3,5 m', '3 × 4 m', '3 × 5 m', '4 × 6 m', 'Otra medida (hasta 24 m²)'],
        max_m2: 24,
        note: 'Se fabrica a medida, desde 2 × 3 m hasta 24 m². Te enviamos el precio por WhatsApp antes de empezar.',
      },
    },
    { onConflict: 'key' },
  );
  console.log('settings.rug_industrial', s.error?.message ?? 'ok');
}
