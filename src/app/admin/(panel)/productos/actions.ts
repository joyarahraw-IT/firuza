'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit, requireAdmin } from '@/lib/admin';
import { acrylicCents, canon, combos, imageFiles, MAX_UPLOAD_BYTES, newImageKey, parseEuros, processPhoto, slugify, type OptionGroupInput } from '@/lib/admin-products';
import { MATERIAL_ACRYLIC, MATERIAL_STONE } from '@/lib/catalog';
import { SPEC_KEYS, type Specs } from '@/lib/guides';
import { FIBERS, MAX_FIBERS, MAX_STONES, METALS, photoKinds, STONE_TYPES, THREADS, type Fiber, type Materials, type PhotoKind, type Stone } from '@/lib/materials';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const done = (id: string, msg: string): never => {
  revalidatePath(`/admin/productos/${id}`);
  redirect(`/admin/productos/${id}?ok=${msg}`);
};
const fail = (id: string, msg: string): never => redirect(`/admin/productos/${id}?err=${encodeURIComponent(msg)}`);

// ---------------------------------------------------------------- create / duplicate / delete / publish
export async function createProduct(f: FormData) {
  const { db } = await requireAdmin();
  const name = str(f, 'name');
  if (name.length < 2) redirect('/admin/productos/nuevo?err=Escribe+un+nombre');
  const mode = str(f, 'delivery_mode') === 'shipped' ? 'shipped' : 'made_to_order';
  let slug = slugify(name);
  const { data: clash } = await db.from('products').select('id').eq('slug', slug).maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data: cat } = await db.from('categories').select('id').eq('id', str(f, 'category_id')).maybeSingle();
  const { data, error } = await db.from('products').insert({
    slug, name, category_id: cat?.id ?? null, delivery_mode: mode, status: 'draft', description: '', base_price_cents: 0,
    making_days_min: mode === 'made_to_order' ? 3 : null, making_days_max: mode === 'made_to_order' ? 5 : null,
    shipping_days_min: mode === 'shipped' ? 15 : null, shipping_days_max: mode === 'shipped' ? 30 : null,
  }).select('id').single();
  if (error || !data) redirect('/admin/productos/nuevo?err=No+se+ha+podido+crear');
  await audit('product_create', 'product', data.id, { slug });
  redirect(`/admin/productos/${data.id}?ok=creado`);
}

export async function duplicateProduct(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const { data: p } = await db.from('products').select('*, product_variants(*), product_images(*)').eq('id', id).single();
  if (!p) redirect('/admin/productos');
  let slug = `${p.slug}-copia`;
  for (let i = 2; (await db.from('products').select('id').eq('slug', slug).maybeSingle()).data; i++) slug = `${p.slug}-copia-${i}`;
  const { id: _i, created_at: _c, updated_at: _u, product_variants, product_images, ...rest } = p;
  const { data: np, error } = await db.from('products').insert({ ...rest, slug, name: `${p.name} (copia)`, status: 'draft', featured: false }).select('id').single();
  if (error || !np) return fail(id, 'No se ha podido duplicar');
  if (product_variants.length) await db.from('product_variants').insert(product_variants.map(({ id: _v, product_id: _p, ...v }: Record<string, unknown>) => ({ ...v, product_id: np.id })));
  // photos are shared files: the copy points to the same storage keys
  if (product_images.length) await db.from('product_images').insert(product_images.map(({ id: _v, product_id: _p, ...v }: Record<string, unknown>) => ({ ...v, product_id: np.id })));
  await audit('product_duplicate', 'product', np.id, { from: p.slug });
  redirect(`/admin/productos/${np.id}?ok=duplicado`);
}

async function removeUnusedFiles(db: Awaited<ReturnType<typeof requireAdmin>>['db'], keys: string[]) {
  for (const key of new Set(keys)) {
    const { count } = await db.from('product_images').select('id', { count: 'exact', head: true }).eq('storage_key', key);
    if (!count) await db.storage.from('product-images').remove(imageFiles(key));
  }
}

export async function deleteProduct(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  if (str(f, 'confirm') !== 'on') return fail(id, 'Marca la casilla para confirmar que quieres eliminarlo');
  const { data: imgs } = await db.from('product_images').select('storage_key').eq('product_id', id);
  const { data: p } = await db.from('products').select('slug').eq('id', id).single();
  const { error } = await db.from('products').delete().eq('id', id);
  if (error) return fail(id, 'No se ha podido eliminar');
  await removeUnusedFiles(db, (imgs ?? []).map((i) => i.storage_key));
  await audit('product_delete', 'product', id, { slug: p?.slug });
  redirect('/admin/productos?ok=eliminado');
}

export async function setStatus(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const to = str(f, 'to') === 'published' ? 'published' : 'draft';
  const back = str(f, 'back') || `/admin/productos/${id}`;
  if (to === 'published') {
    const { data: p } = await db.from('products').select('name, description, care, option_groups, product_images(id), product_variants(id, active)').eq('id', id).single();
    const problems: string[] = [];
    if (!p) return fail(id, 'Producto no encontrado');
    if (!(p.product_images as unknown[]).length) problems.push('no tiene fotos');
    if (!(p.product_variants as { active: boolean }[]).some((v) => v.active)) problems.push('no tiene precios (variantes activas)');
    if (/\[CONFIRMAR/.test(`${p.name} ${p.description} ${p.care ?? ''} ${JSON.stringify(p.option_groups)}`)) problems.push('todavía tiene textos marcados [CONFIRMAR]');
    if (problems.length) redirect(`${back}${back.includes('?') ? '&' : '?'}err=${encodeURIComponent('No se puede publicar: ' + problems.join(', ') + '.')}`);
  }
  await db.from('products').update({ status: to }).eq('id', id);
  await audit(to === 'published' ? 'product_publish' : 'product_unpublish', 'product', id);
  revalidatePath('/', 'layout');
  redirect(`${back}${back.includes('?') ? '&' : '?'}ok=${to === 'published' ? 'publicado' : 'borrador'}`);
}

// ---------------------------------------------------------------- main data
const Base = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre').max(140),
  slug: z.string().trim().min(2).max(90),
  description: z.string().trim().max(3000),
  care: z.string().trim().max(1500),
  materials_note: z.string().trim().max(500),
});

export async function saveProduct(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const p = Base.safeParse({ name: str(f, 'name'), slug: slugify(str(f, 'slug') || str(f, 'name')), description: str(f, 'description'), care: str(f, 'care'), materials_note: str(f, 'materials_note') });
  if (!p.success) return fail(id, p.error.issues[0].message);
  const mode = str(f, 'delivery_mode') === 'shipped' ? 'shipped' : 'made_to_order';
  const n = (k: string) => Number(str(f, k));
  const mMin = n('making_days_min'), mMax = n('making_days_max'), sMin = n('shipping_days_min'), sMax = n('shipping_days_max');
  if (mode === 'made_to_order' && !(mMin >= 1 && mMax >= mMin && mMax <= 10)) return fail(id, 'El plazo de elaboración debe estar entre 1 y 10 días (mínimo ≤ máximo)');
  if (mode === 'shipped' && !(sMin >= 1 && sMax >= sMin && sMax <= 60)) return fail(id, 'El plazo de llegada no es válido');
  const colors: { name: string; hex: string }[] = [];
  for (let i = 1; i <= 8; i++) {
    const name = str(f, `color_name_${i}`);
    const hex = str(f, `color_hex_${i}`);
    if (name && /^#[0-9a-fA-F]{6}$/.test(hex)) colors.push({ name, hex: hex.toLowerCase() });
  }
  const { data: clash } = await db.from('products').select('id').eq('slug', p.data.slug).neq('id', id).maybeSingle();
  if (clash) return fail(id, 'Ya existe otro producto con esa dirección web (slug)');
  const { error } = await db.from('products').update({
    ...p.data, category_id: str(f, 'category_id') || null, delivery_mode: mode, colors,
    making_days_min: mode === 'made_to_order' ? mMin : null, making_days_max: mode === 'made_to_order' ? mMax : null,
    shipping_days_min: mode === 'shipped' ? sMin : null, shipping_days_max: mode === 'shipped' ? sMax : null,
    featured: f.get('featured') === 'on', needs_real_photo: f.get('needs_real_photo') === 'on',
  }).eq('id', id);
  if (error) return fail(id, 'No se han podido guardar los datos');
  await audit('product_update', 'product', id, { slug: p.data.slug });
  revalidatePath('/', 'layout');
  done(id, 'datos');
}

// ---------------------------------------------------------------- measurements (products.specs)
export async function saveSpecs(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const specs: Specs = {};
  for (const k of SPEC_KEYS) {
    const raw = str(f, `spec_${k}`).replace(',', '.');
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || n > 10000) return fail(id, 'Revisa las medidas: solo números positivos');
    specs[k] = n;
  }
  if (f.get('spec_provisional') === 'on') specs.provisional = true;
  const { error } = await db.from('products').update({ specs }).eq('id', id);
  if (error) return fail(id, 'No se han podido guardar las medidas (¿has aplicado fix-0011-specs.sql?)');
  await audit('product_specs', 'product', id);
  revalidatePath('/', 'layout');
  done(id, 'medidas');
}

// ---------------------------------------------------------------- materials (products.materials)
export async function saveMaterials(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const stones: Stone[] = [];
  for (let i = 1; i <= MAX_STONES; i++) {
    const type = str(f, `stone_type_${i}`);
    if (!type) continue;
    if (!(STONE_TYPES as readonly string[]).includes(type)) return fail(id, `Piedra ${i}: tipo no válido`);
    const variety = str(f, `stone_variety_${i}`).slice(0, 40);
    const name = type === 'Otra' ? variety : `${type}${variety ? ` ${variety}` : ''}`;
    if (!name) return fail(id, `Piedra ${i}: con «Otra» escribe el nombre`);
    stones.push({ name, natural: f.get(`stone_natural_${i}`) === 'on' });
  }
  const fibers: Fiber[] = [];
  for (let i = 1; i <= MAX_FIBERS; i++) {
    const fiber = str(f, `fiber_${i}`);
    const raw = str(f, `fiber_pct_${i}`);
    if (!fiber && !raw) continue;
    const pct = Number(raw);
    if (!(FIBERS as readonly string[]).includes(fiber) || !Number.isInteger(pct) || pct < 1 || pct > 100) return fail(id, `Fibra ${i}: elige la fibra y un porcentaje entre 1 y 100`);
    fibers.push({ fiber, pct });
  }
  if (fibers.length && fibers.reduce((n, x) => n + x.pct, 0) !== 100) return fail(id, 'La composición de fibras debe sumar exactamente 100 %');
  const metal = str(f, 'metal');
  const thread = str(f, 'thread');
  if (metal && !(METALS as readonly string[]).includes(metal)) return fail(id, 'Metal no válido');
  if (thread && !(THREADS as readonly string[]).includes(thread)) return fail(id, 'Montaje no válido');
  const materials: Materials = {
    ...(stones.length ? { stones } : {}),
    ...(metal ? { metal } : {}),
    ...(thread ? { thread } : {}),
    ...(fibers.length ? { fibers } : {}),
    ...(str(f, 'care') ? { care: str(f, 'care').slice(0, 600) } : {}),
  };
  const { error } = await db.from('products').update({ materials }).eq('id', id);
  if (error) return fail(id, 'No se han podido guardar los materiales (¿has aplicado fix-0012-materials.sql?)');
  await audit('product_materials', 'product', id);
  revalidatePath('/', 'layout');
  done(id, 'materiales');
}

// ---------------------------------------------------------------- options and prices
/** Saves the option groups and creates the missing variant combinations (price = the product's lowest current price). */
export async function saveOptions(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const groups: OptionGroupInput[] = [];
  for (let i = 1; i <= 4; i++) {
    const name = str(f, `g_name_${i}`);
    const values = str(f, `g_values_${i}`).split('\n').map((v) => v.trim()).filter(Boolean);
    if (!name && !values.length) continue;
    if (!name || !values.length) return fail(id, `Grupo ${i}: escribe el nombre y al menos un valor`);
    if (new Set(values).size !== values.length) return fail(id, `Grupo ${i}: hay valores repetidos`);
    const quote = str(f, `g_quote_${i}`).split('\n').map((v) => v.trim()).filter((v) => values.includes(v));
    groups.push({ name, required: true, values, ...(quote.length ? { quote_values: quote } : {}) });
  }
  if (new Set(groups.map((g) => g.name)).size !== groups.length) return fail(id, 'Hay dos grupos con el mismo nombre');
  const wanted = combos(groups);
  if (wanted.length > 120) return fail(id, `Demasiadas combinaciones (${wanted.length}). Máximo 120.`);

  const { data: existing } = await db.from('product_variants').select('id, options, price_cents, active').eq('product_id', id);
  const byKey = new Map((existing ?? []).map((v) => [canon(v.options), v]));
  const wantedKeys = new Set(wanted.map(canon));
  const fallback = Math.min(...((existing ?? []).filter((v) => v.active).map((v) => v.price_cents)), Infinity);
  const price = Number.isFinite(fallback) ? fallback : 0;

  const toCreate = wanted.filter((o) => !byKey.has(canon(o)));
  const toReactivate = (existing ?? []).filter((v) => wantedKeys.has(canon(v.options)) && !v.active).map((v) => v.id);
  const toDeactivate = (existing ?? []).filter((v) => !wantedKeys.has(canon(v.options)) && v.active).map((v) => v.id);
  const order = new Map(wanted.map((o, i) => [canon(o), i]));

  await db.from('products').update({ option_groups: groups }).eq('id', id);
  if (toCreate.length) await db.from('product_variants').insert(toCreate.map((o) => ({ product_id: id, options: o, price_cents: price, sort_order: order.get(canon(o)) ?? 0 })));
  if (toReactivate.length) await db.from('product_variants').update({ active: true }).in('id', toReactivate);
  if (toDeactivate.length) await db.from('product_variants').update({ active: false }).in('id', toDeactivate); // kept (not deleted): old orders point to them
  for (const v of existing ?? []) if (wantedKeys.has(canon(v.options))) await db.from('product_variants').update({ sort_order: order.get(canon(v.options)) ?? 0 }).eq('id', v.id);
  await syncBasePrice(db, id);
  await audit('product_options', 'product', id, { groups: groups.map((g) => g.name), created: toCreate.length, deactivated: toDeactivate.length });
  revalidatePath('/', 'layout');
  done(id, 'opciones');
}

async function syncBasePrice(db: Awaited<ReturnType<typeof requireAdmin>>['db'], id: string) {
  const { data } = await db.from('product_variants').select('price_cents').eq('product_id', id).eq('active', true);
  const min = Math.min(...(data ?? []).map((v) => v.price_cents), Infinity);
  if (Number.isFinite(min)) await db.from('products').update({ base_price_cents: min }).eq('id', id);
}

export async function saveVariants(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const ids = f.getAll('vid').map(String);
  for (const vid of ids) {
    const cents = parseEuros(str(f, `price_${vid}`));
    if (cents === null) return fail(id, 'Revisa los precios: deben ser números como 52,90');
    await db.from('product_variants').update({ price_cents: cents, active: f.get(`active_${vid}`) === 'on' }).eq('id', vid).eq('product_id', id);
  }
  await syncBasePrice(db, id);
  await audit('product_prices', 'product', id, { variants: ids.length });
  revalidatePath('/', 'layout');
  done(id, 'precios');
}

/** Owner rule: "Cuentas acrílicas" costs the stone price ÷ 6 (rounded to x.90, min 5,90). Fills in the acrylic prices from the stone ones. */
export async function applyAcrylicRule(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const { data: vs } = await db.from('product_variants').select('id, options, price_cents').eq('product_id', id);
  let changed = 0;
  for (const v of vs ?? []) {
    if (v.options['Material'] !== MATERIAL_ACRYLIC) continue;
    const stone = (vs ?? []).find((s) => s.options['Material'] === MATERIAL_STONE && canon({ ...s.options, Material: '' }) === canon({ ...v.options, Material: '' }));
    if (!stone) continue;
    await db.from('product_variants').update({ price_cents: acrylicCents(stone.price_cents) }).eq('id', v.id);
    changed++;
  }
  await syncBasePrice(db, id);
  await audit('product_acrylic_rule', 'product', id, { changed });
  revalidatePath('/', 'layout');
  done(id, changed ? 'acrilico' : 'sin-acrilico');
}

// ---------------------------------------------------------------- photos
export async function uploadImages(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const { data: p } = await db.from('products').select('slug, name').eq('id', id).single();
  if (!p) return fail(id, 'Producto no encontrado');
  const kind = (photoKinds as readonly string[]).includes(str(f, 'kind')) ? (str(f, 'kind') as PhotoKind) : 'studio';
  const files = f.getAll('photos').filter((x): x is File => x instanceof File && x.size > 0).slice(0, 10);
  if (!files.length) return fail(id, 'Elige al menos una foto');
  const { data: existing } = await db.from('product_images').select('sort_order, is_cover').eq('product_id', id);
  let order = Math.max(-1, ...(existing ?? []).map((i) => i.sort_order)) + 1;
  let hasCover = (existing ?? []).some((i) => i.is_cover);
  let ok = 0;
  const bad: string[] = [];
  for (const file of files) {
    try {
      if (file.size > MAX_UPLOAD_BYTES) throw new Error('pesa más de 12 MB');
      const img = await processPhoto(Buffer.from(await file.arrayBuffer()));
      const key = newImageKey(p.slug);
      const [w, j, t] = imageFiles(key);
      const bucket = db.storage.from('product-images');
      const results = await Promise.all([
        bucket.upload(w, img.webp, { contentType: 'image/webp', cacheControl: '31536000' }),
        bucket.upload(j, img.jpg, { contentType: 'image/jpeg', cacheControl: '31536000' }),
        bucket.upload(t, img.thumb, { contentType: 'image/webp', cacheControl: '31536000' }),
      ]);
      const err = results.find((r) => r.error)?.error;
      if (err) throw new Error(err.message);
      const { error } = await db.from('product_images').insert({ product_id: id, storage_key: key, alt: p.name, role: ok === 0 && !hasCover ? 'main' : 'extra', is_cover: !hasCover, sort_order: order++, ...(kind !== 'studio' ? { kind } : {}) });
      if (error) throw new Error(error.message);
      hasCover = true;
      ok++;
    } catch (e) {
      bad.push(`${file.name} (${e instanceof Error ? e.message : 'error'})`);
    }
  }
  await audit('product_photos_upload', 'product', id, { uploaded: ok, failed: bad.length });
  revalidatePath('/', 'layout');
  if (bad.length) return fail(id, `Subidas: ${ok}. No se pudieron subir: ${bad.join('; ')}`);
  done(id, 'fotos');
}

export async function moveImage(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const dir = str(f, 'dir') === 'up' ? -1 : 1;
  const { data: imgs } = await db.from('product_images').select('id, sort_order').eq('product_id', id).order('sort_order');
  const list = imgs ?? [];
  const i = list.findIndex((x) => x.id === str(f, 'image'));
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return done(id, 'fotos');
  // renumber 0..n-1 with the two swapped
  [list[i], list[j]] = [list[j], list[i]];
  for (const [k, im] of list.entries()) await db.from('product_images').update({ sort_order: k }).eq('id', im.id);
  revalidatePath('/', 'layout');
  done(id, 'fotos');
}

export async function setCover(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  await db.from('product_images').update({ is_cover: false }).eq('product_id', id);
  await db.from('product_images').update({ is_cover: true }).eq('id', str(f, 'image')).eq('product_id', id);
  // the cover is shown first everywhere: make it the first in order
  const { data: imgs } = await db.from('product_images').select('id, is_cover, sort_order').eq('product_id', id).order('sort_order');
  const sorted = [...(imgs ?? [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
  for (const [k, im] of sorted.entries()) await db.from('product_images').update({ sort_order: k }).eq('id', im.id);
  revalidatePath('/', 'layout');
  done(id, 'fotos');
}

export async function saveImageAlt(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  await db.from('product_images').update({ alt: str(f, 'alt').slice(0, 200) || null }).eq('id', str(f, 'image')).eq('product_id', id);
  revalidatePath('/', 'layout');
  done(id, 'fotos');
}

export async function saveImageKind(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const kind = str(f, 'kind');
  if (!(photoKinds as readonly string[]).includes(kind)) return fail(id, 'Tipo de foto no válido');
  const { error } = await db.from('product_images').update({ kind }).eq('id', str(f, 'image')).eq('product_id', id);
  if (error) return fail(id, 'No se ha podido guardar el tipo de foto (¿has aplicado fix-0012-materials.sql?)');
  revalidatePath('/', 'layout');
  done(id, 'fotos');
}

export async function deleteImage(f: FormData) {
  const { db } = await requireAdmin();
  const id = str(f, 'id');
  const { data: img } = await db.from('product_images').select('storage_key, is_cover').eq('id', str(f, 'image')).eq('product_id', id).single();
  if (!img) return done(id, 'fotos');
  await db.from('product_images').delete().eq('id', str(f, 'image'));
  await removeUnusedFiles(db, [img.storage_key]);
  if (img.is_cover) {
    const { data: first } = await db.from('product_images').select('id').eq('product_id', id).order('sort_order').limit(1).maybeSingle();
    if (first) await db.from('product_images').update({ is_cover: true }).eq('id', first.id);
  }
  await audit('product_photo_delete', 'product', id);
  revalidatePath('/', 'layout');
  done(id, 'fotos');
}
