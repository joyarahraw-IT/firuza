'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit, requireAdmin } from '@/lib/admin';
import { parseEuros, slugify } from '@/lib/admin-products';

type Db = Awaited<ReturnType<typeof requireAdmin>>['db'];
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const lines = (f: FormData, k: string) => s(f, k).split('\n').map((x) => x.trim()).filter(Boolean);
const back = (anchor: string, msg: string, kind: 'ok' | 'err' = 'ok'): never => {
  revalidatePath('/', 'layout');
  redirect(`/admin/ajustes?${kind}=${encodeURIComponent(msg)}#${anchor}`);
};

async function current(db: Db, key: string) {
  const { data } = await db.from('settings').select('value').eq('key', key).maybeSingle();
  return (data?.value ?? {}) as Record<string, unknown>;
}
async function put(db: Db, key: string, value: unknown, isPublic: boolean) {
  const { error } = await db.from('settings').upsert({ key, value, is_public: isPublic }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}
const int = (f: FormData, k: string, min: number, max: number) => {
  const n = Number(s(f, k));
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export async function saveGeneral(f: FormData) {
  const { db } = await requireAdmin();
  const prefix = s(f, 'order_prefix').toUpperCase();
  if (!/^[A-Z]{2,4}$/.test(prefix)) return back('general', 'El prefijo de pedido son 2–4 letras (por ejemplo HV).', 'err');
  const wa = s(f, 'whatsapp').replace(/\D/g, '');
  if (wa.length < 9) return back('general', 'El WhatsApp debe incluir el prefijo del país (por ejemplo 34600000000).', 'err');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s(f, 'email'))) return back('general', 'Revisa el email de contacto.', 'err');
  await put(db, 'brand', s(f, 'brand') || 'Firuza', true);
  await put(db, 'announcement', s(f, 'announcement'), true);
  await put(db, 'contact', { email: s(f, 'email'), whatsapp: wa, instagram: s(f, 'instagram') || null }, true);
  await put(db, 'order_prefix', prefix, false);
  await audit('settings_general', 'settings', 'general');
  back('general', 'Ajustes generales guardados.');
}

export async function saveShipping(f: FormData) {
  const { db } = await requireAdmin();
  const t = { es_min: int(f, 'es_min', 1, 30), es_max: int(f, 'es_max', 1, 30), eu_min: int(f, 'eu_min', 1, 45), eu_max: int(f, 'eu_max', 1, 45) };
  if (Object.values(t).some((v) => v === null) || t.es_max! < t.es_min! || t.eu_max! < t.eu_min!) return back('envios', 'Revisa los plazos de envío (el máximo no puede ser menor que el mínimo).', 'err');
  const madrid = parseEuros(s(f, 'madrid')), spain = parseEuros(s(f, 'spain')), eu = parseEuros(s(f, 'eu'));
  if (madrid === null || spain === null || eu === null) return back('envios', 'Revisa los precios de envío: números como 4,90 (0 = gratis).', 'err');
  const prev = await current(db, 'shipping');
  await put(db, 'shipping', { ...prev, ...t, text: s(f, 'text') }, true);
  await put(db, 'shipping_rates', { madrid_cents: madrid, spain_cents: spain, eu_cents: eu, consult_label: s(f, 'consult_label') || 'Envío a consultar', rug_label: s(f, 'rug_label') }, true);
  await audit('settings_shipping', 'settings', 'shipping', { madrid, spain, eu });
  back('envios', 'Envíos guardados. Los pedidos nuevos usan estos precios.');
}

export async function savePayment(f: FormData) {
  const { db } = await requireAdmin();
  await put(db, 'payment', { methods: lines(f, 'methods'), text: s(f, 'text') }, true);
  await audit('settings_payment', 'settings', 'payment');
  back('pagos', 'Pagos guardados.');
}

export async function saveRugs(f: FormData) {
  const { db } = await requireAdmin();
  const max = Number(s(f, 'max_m2').replace(',', '.'));
  const min = int(f, 'rug_min', 1, 90), mx = int(f, 'rug_max', 1, 90);
  if (!(max >= 2 && max <= 200) || min === null || mx === null || mx < min) return back('alfombras', 'Revisa los valores de las alfombras.', 'err');
  await put(db, 'rug_texts', { silk_note: s(f, 'silk_note') }, true);
  await put(db, 'rug_industrial', { sizes: lines(f, 'sizes'), max_m2: max, note: s(f, 'note') }, true);
  const prev = await current(db, 'rug_shipping');
  await put(db, 'rug_shipping', { ...prev, min, max: mx }, true);
  await audit('settings_rugs', 'settings', 'rugs');
  back('alfombras', 'Ajustes de alfombras guardados.');
}

export async function saveLegal(f: FormData) {
  const { db } = await requireAdmin();
  // private row (is_public = false): the NIE must never be readable through the public API
  await put(db, 'legal_owner', { name: s(f, 'name'), nie: s(f, 'nie'), email: s(f, 'email'), address: s(f, 'address') }, false);
  const texts: Record<string, string> = {};
  for (const k of ['aviso', 'privacidad', 'condiciones', 'envios', 'devoluciones', 'cookies']) texts[k] = String(f.get(`t_${k}`) ?? '').trim();
  await put(db, 'legal_texts', texts, true);
  await audit('settings_legal', 'settings', 'legal');
  back('legales', 'Datos y textos legales guardados.');
}

// ---------------------------------------------------------------- categories
export async function addCategory(f: FormData) {
  const { db } = await requireAdmin();
  const name = s(f, 'name');
  if (name.length < 2) return back('categorias', 'Escribe el nombre de la categoría.', 'err');
  const { data: last } = await db.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  let slug = slugify(name);
  if ((await db.from('categories').select('id').eq('slug', slug).maybeSingle()).data) slug = `${slug}-${Date.now().toString(36).slice(-3)}`;
  await db.from('categories').insert({ name, slug, blurb: s(f, 'blurb') || null, sort_order: (last?.sort_order ?? 0) + 1 });
  await audit('category_add', 'category', slug);
  back('categorias', 'Categoría añadida.');
}

export async function renameCategory(f: FormData) {
  const { db } = await requireAdmin();
  const name = s(f, 'name');
  if (name.length < 2) return back('categorias', 'El nombre es demasiado corto.', 'err');
  await db.from('categories').update({ name, blurb: s(f, 'blurb') || null }).eq('id', s(f, 'id'));
  await audit('category_rename', 'category', s(f, 'id'));
  back('categorias', 'Categoría actualizada.');
}

export async function moveCategory(f: FormData) {
  const { db } = await requireAdmin();
  const { data } = await db.from('categories').select('id').order('sort_order');
  const list = data ?? [];
  const i = list.findIndex((c) => c.id === s(f, 'id'));
  const j = i + (s(f, 'dir') === 'up' ? -1 : 1);
  if (i >= 0 && j >= 0 && j < list.length) {
    [list[i], list[j]] = [list[j], list[i]];
    for (const [k, c] of list.entries()) await db.from('categories').update({ sort_order: k + 1 }).eq('id', c.id);
  }
  back('categorias', 'Orden actualizado.');
}

export async function deleteCategory(f: FormData) {
  const { db } = await requireAdmin();
  const id = s(f, 'id');
  const { count } = await db.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if (count) return back('categorias', `No se puede eliminar: tiene ${count} productos. Muévelos a otra categoría antes.`, 'err');
  await db.from('categories').delete().eq('id', id);
  await audit('category_delete', 'category', id);
  back('categorias', 'Categoría eliminada.');
}

// ---------------------------------------------------------------- owner photo ("Sobre mí")
import { imageFiles, MAX_UPLOAD_BYTES, newImageKey, processPhoto } from '@/lib/admin-products';

async function dropOwnerFiles(db: Db, key: string | undefined) {
  if (key) await db.storage.from('product-images').remove(imageFiles(key));
}

export async function uploadOwnerPhoto(f: FormData) {
  const { db } = await requireAdmin();
  const file = f.get('photo');
  if (!(file instanceof File) || file.size === 0) return back('sobre-mi', 'Elige una foto.', 'err');
  if (file.size > MAX_UPLOAD_BYTES) return back('sobre-mi', 'La foto pesa más de 12 MB.', 'err');
  let img;
  try {
    img = await processPhoto(Buffer.from(await file.arrayBuffer()));
  } catch {
    return back('sobre-mi', 'No se ha podido leer la imagen. Usa JPG, PNG o WebP.', 'err');
  }
  const key = newImageKey('site').replace('site/', 'site/owner-');
  const [w, j, t] = imageFiles(key);
  const bucket = db.storage.from('product-images');
  const res = await Promise.all([
    bucket.upload(w, img.webp, { contentType: 'image/webp', cacheControl: '31536000' }),
    bucket.upload(j, img.jpg, { contentType: 'image/jpeg', cacheControl: '31536000' }),
    bucket.upload(t, img.thumb, { contentType: 'image/webp', cacheControl: '31536000' }),
  ]);
  if (res.some((r) => r.error)) return back('sobre-mi', 'No se ha podido subir la foto.', 'err');
  const prev = await current(db, 'owner_photo');
  await put(db, 'owner_photo', { key, alt: s(f, 'alt') || 'Nombre Apellido, en su taller' }, true);
  await dropOwnerFiles(db, prev.key as string | undefined);
  await audit('owner_photo_upload', 'settings', 'owner_photo');
  back('sobre-mi', 'Foto guardada. Ya se ve en «Sobre mí».');
}

export async function removeOwnerPhoto() {
  const { db } = await requireAdmin();
  const prev = await current(db, 'owner_photo');
  await db.from('settings').delete().eq('key', 'owner_photo');
  await dropOwnerFiles(db, prev.key as string | undefined);
  await audit('owner_photo_remove', 'settings', 'owner_photo');
  back('sobre-mi', 'Foto eliminada. Se muestra el dibujo de kilim.');
}
