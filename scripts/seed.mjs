// Loads the 37 draft products (+ photos) into Supabase.
//   npm run db:seed            -> adds products that do not exist yet (never overwrites what you edited in /admin)
//   npm run db:seed -- --force -> re-creates variants/images of EVERY seed product (overwrites your edits to those)
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local, and the SQL migrations already applied.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = (process.env.SUPABASE_SECRET_KEY ?? '').trim();   // never printed

/** Returns a problem description if the key cannot be the server (secret / service_role) key, else null. */
function keyProblem() {
  if (!url) return 'NEXT_PUBLIC_SUPABASE_URL is missing in .env.local.';
  if (!secret) return 'SUPABASE_SECRET_KEY is empty or missing in .env.local. Paste your sb_secret_... key after the = sign and save the file.';
  if (secret.startsWith('sb_publishable_') || (publishable && secret === publishable))
    return 'SUPABASE_SECRET_KEY holds the PUBLISHABLE key. Use the Secret key (sb_secret_...) from Supabase > Project Settings > API Keys.';
  if (secret.startsWith('eyJ')) {
    try {
      const role = JSON.parse(Buffer.from(secret.split('.')[1], 'base64url').toString()).role;
      if (role !== 'service_role') return 'SUPABASE_SECRET_KEY is a legacy key that is not the service_role key.';
    } catch { return 'SUPABASE_SECRET_KEY looks like a legacy JWT but cannot be decoded.'; }
  } else if (!secret.startsWith('sb_secret_')) {
    return 'SUPABASE_SECRET_KEY does not look like a secret key (expected it to start with sb_secret_).';
  }
  return null;
}

const force = process.argv.includes('--force');
const BUCKET = 'product-images';
const contentTypes = { '.webp': 'image/webp', '.jpg': 'image/jpeg' };

async function main() {
  const problem = keyProblem();
  if (problem) throw new Error(problem);

  // This client is built with the SECRET key, so it bypasses RLS: it is the only way the seed may write.
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const seed = JSON.parse(fs.readFileSync('data/seed/products.seed.json', 'utf8'));

  const { data: cats, error: catErr } = await db.from('categories').select('id, slug');
  if (catErr) {
    const hint = /permission denied/i.test(catErr.message)
      ? 'The table privileges are missing. Paste supabase/fix-grants.sql into the Supabase SQL Editor and run it, then try again.'
      : /does not exist|schema cache/i.test(catErr.message)
        ? 'The tables do not exist yet. Paste supabase/setup.sql into the Supabase SQL Editor and run it, then try again.'
        : 'Check the project URL and the secret key in .env.local.';
    throw new Error(`Cannot read categories (${catErr.message}). ${hint}`);
  }
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  async function upload(slug, file) {
    for (const name of [`${file}.webp`, `${file}.jpg`, `${file}-thumb.webp`]) {
      const local = path.join('public/products', slug, name);
      const { error } = await db.storage.from(BUCKET).upload(`${slug}/${name}`, fs.readFileSync(local), {
        upsert: true,
        contentType: contentTypes[path.extname(name)],
        cacheControl: '31536000',
      });
      if (error) throw new Error(`upload ${slug}/${name}: ${error.message}`);
    }
  }

  let created = 0, skipped = 0;
  for (const [i, p] of seed.entries()) {
    const { data: existing } = await db.from('products').select('id').eq('slug', p.slug).maybeSingle();
    if (existing && !force) { skipped++; continue; }

    const row = {
      slug: p.slug,
      category_id: catId[p.category],
      name: p.name,
      description: p.description,
      care: p.care ?? null,
      materials_note: p.length ?? null,
      status: 'draft',
      delivery_mode: p.delivery_mode,
      making_days_min: p.making_days?.[0] ?? null,
      making_days_max: p.making_days?.[1] ?? null,
      shipping_days_min: p.shipping_days?.[0] ?? null,
      shipping_days_max: p.shipping_days?.[1] ?? null,
      colors: p.colors,
      option_groups: p.option_groups,
      base_price_cents: p.base_price_cents,
      featured: !!p.featured,
      needs_real_photo: !!p.needs_real_photo,
      sort_order: i,
    };
    const { data: prod, error } = await db.from('products').upsert(row, { onConflict: 'slug' }).select('id').single();
    if (error) throw new Error(`${p.slug}: ${error.message}`);

    await db.from('product_variants').delete().eq('product_id', prod.id);
    const { error: vErr } = await db.from('product_variants').insert(
      p.variants.map((v, k) => ({ product_id: prod.id, options: v.options, price_cents: v.price_cents, sort_order: k })),
    );
    if (vErr) throw new Error(`${p.slug} variants: ${vErr.message}`);

    await db.from('product_images').delete().eq('product_id', prod.id);
    for (const img of p.images) await upload(p.slug, img.file);
    const { error: iErr } = await db.from('product_images').insert(
      p.images.map((img, k) => ({
        product_id: prod.id,
        storage_key: `${p.slug}/${img.file}`,
        alt: img.role === 'main' ? p.name : `${p.name} (${img.role})`,
        role: img.role,
        is_cover: k === 0,
        sort_order: k,
      })),
    );
    if (iErr) throw new Error(`${p.slug} images: ${iErr.message}`);
    created++;
    console.log(`+ ${p.slug} (${p.variants.length} variants, ${p.images.length} images)`);
  }
  console.log(`\nDone. Created/updated: ${created}. Skipped (already there): ${skipped}. All products are DRAFT: publish them from /admin.`);

}

main().catch((e) => {
  console.error('\nSeed stopped: ' + (e?.message ?? e));
  process.exitCode = 1;   // not process.exit(): exiting with open handles crashes Node on Windows
});
