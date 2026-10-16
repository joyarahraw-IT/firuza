import 'server-only';
import { cache } from 'react';
import seed from '../../data/seed/products.seed.json';
import { publicClient, serviceClient } from './supabase/server';
import { DEFAULT_RATES, type ShippingRates } from './shipping';
import { BIZUM, PAY_METHODS, stripBizum } from './pay-methods';
import { DEFAULT_GUIDES, type Guides, type Specs } from './guides';
import type { Materials, PhotoKind } from './materials';

export const MATERIAL_STONE = 'Piedras, perlas y cristal';
export const MATERIAL_ACRYLIC = 'Cuentas acrílicas';

/** quote_values: option values that cannot be bought online (price on request via WhatsApp), e.g. industrial rugs */
export type OptionGroup = { name: string; required: boolean; values: string[]; quote_values?: string[] };
export type Variant = { id: string; options: Record<string, string>; price_cents: number };
export type ProductImage = { key: string; alt: string; role: string; cover: boolean; kind: PhotoKind };
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string; // category slug
  description: string;
  care: string | null;
  materials_note: string | null;
  status: 'draft' | 'published';
  delivery_mode: 'made_to_order' | 'shipped';
  making_days: [number, number] | null;
  shipping_days: [number, number] | null;
  colors: { name: string; hex: string }[];
  base_price_cents: number;
  option_groups: OptionGroup[];
  variants: Variant[];
  images: ProductImage[];
  needs_real_photo: boolean;
  featured: boolean;
  /** measurements (products.specs); empty until the owner fills them in, see lib/guides specsOf() */
  specs: Specs;
  /** real materials entered by the owner (products.materials); empty until then */
  materials: Materials;
};
export type Category = { slug: string; name: string; blurb: string | null };
export type ShipSettings = { es_min: number; es_max: number; eu_min: number; eu_max: number; text?: string };

const useSeed = () => process.env.USE_SEED_DATA === '1';
/** Local preview only: also show draft products (read with the secret key, never in production). */
const previewDrafts = () => process.env.NODE_ENV !== 'production' && process.env.PREVIEW_DRAFTS === '1' && !!process.env.SUPABASE_SECRET_KEY;

export { imageUrl } from './images';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function fromRow(r: Row): Product {
  const range = (a: number | null, b: number | null): [number, number] | null => (a == null || b == null ? null : [a, b]);
  const images = ([...(r.product_images ?? [])] as Row[]).sort((a, b) => a.sort_order - b.sort_order);
  const variants = ([...(r.product_variants ?? [])] as Row[]).filter((v) => v.active).sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.categories?.slug ?? '',
    description: r.description,
    care: r.care,
    materials_note: r.materials_note,
    status: r.status,
    delivery_mode: r.delivery_mode,
    making_days: range(r.making_days_min, r.making_days_max),
    shipping_days: range(r.shipping_days_min, r.shipping_days_max),
    colors: r.colors ?? [],
    base_price_cents: r.base_price_cents,
    option_groups: r.option_groups ?? [],
    variants: variants.map((v) => ({ id: v.id, options: v.options, price_cents: v.price_cents })),
    images: images.map((i) => ({ key: i.storage_key, alt: i.alt ?? r.name, role: i.role ?? '', cover: i.is_cover, kind: (i.kind ?? 'studio') as PhotoKind })),
    needs_real_photo: r.needs_real_photo,
    featured: r.featured,
    specs: (r.specs ?? {}) as Specs,
    materials: (r.materials ?? {}) as Materials,
  };
}

function fromSeed(): Product[] {
  return (seed as any[]).map((p, i) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: `seed-${p.slug}`,
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
    care: p.care ?? null,
    materials_note: p.length ?? null,
    status: 'draft' as const,
    delivery_mode: p.delivery_mode,
    making_days: p.making_days ?? null,
    shipping_days: p.shipping_days ?? null,
    colors: p.colors,
    base_price_cents: p.base_price_cents,
    option_groups: p.option_groups,
    variants: p.variants.map((v: any, k: number) => ({ id: `seed-${p.slug}-${k}`, options: v.options, price_cents: v.price_cents })), // eslint-disable-line @typescript-eslint/no-explicit-any
    images: p.images.map((im: any) => ({ key: `${p.slug}/${im.file}`, alt: p.name, role: im.role, cover: im.cover, kind: 'studio' as PhotoKind })), // eslint-disable-line @typescript-eslint/no-explicit-any
    needs_real_photo: !!p.needs_real_photo,
    featured: !!p.featured,
    specs: {} as Specs,
    materials: {} as Materials,
    _order: i,
  }));
}

const SELECT = '*, categories(slug), product_variants(id, options, price_cents, active, sort_order), product_images(storage_key, alt, role, is_cover, sort_order)';

export const getProducts = cache(async (): Promise<Product[]> => {
  if (useSeed()) return fromSeed();
  const db = previewDrafts() ? serviceClient() : publicClient();
  const { data, error } = await db.from('products').select(SELECT).order('sort_order');
  if (error) throw new Error(`Cannot load products: ${error.message}`);
  return (data as Row[]).map(fromRow).filter((p) => p.variants.length > 0 && p.images.length > 0);
});

export const getProduct = async (slug: string) => (await getProducts()).find((p) => p.slug === slug) ?? null;

const CATEGORY_FALLBACK: Category[] = [
  { slug: 'tejidos-crochet', name: 'Tejidos y crochet', blurb: 'Crochet y macramé hechos a mano.' },
  { slug: 'collares', name: 'Collares', blurb: 'Collares de cuentas, perlas y cristal.' },
  { slug: 'pulseras', name: 'Pulseras', blurb: 'Pulseras de cuentas y perlas.' },
  { slug: 'pendientes', name: 'Pendientes', blurb: 'Pendientes de cuentas, por pares.' },
  { slug: 'alfombras-kilims', name: 'Alfombras y kilims', blurb: 'Alfombras y kilims ya tejidos.' },
];

export const getCategories = cache(async (): Promise<Category[]> => {
  if (useSeed()) return CATEGORY_FALLBACK;
  const { data, error } = await publicClient().from('categories').select('slug, name, blurb').order('sort_order');
  if (error) throw new Error(`Cannot load categories: ${error.message}`);
  return data as Category[];
});

/** Public settings (key -> value). Falls back to sane defaults if the database is not reachable or empty. */
export const getSettings = cache(async () => {
  const defaults = {
    shipping: { es_min: 2, es_max: 4, eu_min: 4, eu_max: 7, text: '' } as ShipSettings,
    rug_shipping: { min: 15, max: 30, text: '' },
    shipping_rates: DEFAULT_RATES as ShippingRates,
    rug_industrial: { sizes: ['2 × 3 m', '2,5 × 3,5 m', '3 × 4 m', '3 × 5 m', '4 × 6 m', 'Otra medida (hasta 24 m²)'], max_m2: 24, note: 'Se fabrica a medida, desde 2 × 3 m hasta 24 m². Te enviamos el precio por WhatsApp antes de empezar.' },
    rug_texts: { silk_note: 'Estas medidas y precios corresponden a la alfombra de seda anudada a mano.' },
    payment: { methods: BIZUM ? ['Tarjeta', 'Bizum'] : ['Tarjeta'], text: '' },
    contact: { email: 'contacto@example.com', whatsapp: '34600000000', instagram: null as string | null },
    owner: { show_age: false } as { show_age: boolean },
    owner_photo: null as { key: string; alt?: string } | null,
    size_guides: DEFAULT_GUIDES as Guides,
    legal_texts: {} as Record<string, string>,
    announcement: `Envío a toda la UE · Pago seguro con ${PAY_METHODS} · Piezas hechas a mano`,
  };
  if (useSeed()) return defaults;
  const { data } = await publicClient().from('settings').select('key, value');
  const out: Record<string, any> = { ...defaults }; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const r of data ?? []) out[r.key] = r.value;
  // while Bizum is off (STRIPE_BIZUM_ENABLED), never show it, even if the DB texts still mention it
  out.size_guides = { ...DEFAULT_GUIDES, ...(out.size_guides ?? {}) };
  if (typeof out.announcement === 'string') out.announcement = stripBizum(out.announcement);
  if (Array.isArray(out.payment?.methods)) out.payment = { ...out.payment, methods: out.payment.methods.filter((m: string) => BIZUM || !/bizum/i.test(m)) };
  return out as typeof defaults;
});

export type Review = { rating: number; title: string | null; body: string; author: string; created_at: string };

/** Approved reviews of a product (anonymous visitors can only ever read approved ones: RLS). */
export async function getReviews(productId: string): Promise<Review[]> {
  if (useSeed() || productId.startsWith('seed-')) return [];
  const { data } = await publicClient().from('reviews').select('*').eq('product_id', productId).eq('status', 'approved').order('created_at', { ascending: false }).limit(50);
  return (data ?? []).map((r: Row) => ({ rating: r.rating, title: r.title, body: r.body, author: r.author_name || 'Cliente', created_at: r.created_at }));
}

export type HomeReview = Review & { product: { name: string; slug: string } | null };

/** Latest approved reviews across the shop (RLS: anonymous visitors only ever read approved ones). Empty when there are none. */
export async function getRecentReviews(limit = 3): Promise<HomeReview[]> {
  if (useSeed()) return [];
  const { data } = await publicClient().from('reviews').select('*, products(name, slug)').eq('status', 'approved').order('created_at', { ascending: false }).limit(limit);
  return (data ?? []).map((r: Row) => ({ rating: r.rating, title: r.title, body: r.body, author: r.author_name || 'Cliente', created_at: r.created_at, product: r.products ? { name: r.products.name, slug: r.products.slug } : null }));
}

export type LegalOwner = { name: string; nie: string; address: string; email: string };
const PENDING = '[pendiente]';

/**
 * The shop owner (titular, seller of record, Stripe account holder). Stored in the NON-public settings row 'legal_owner'
 * (read with the service key, server only). Missing values show as "[pendiente]". The NIE may only be printed on the Aviso legal page.
 */
export const getLegalOwner = cache(async (): Promise<LegalOwner> => {
  let v: Partial<LegalOwner> = {};
  try {
    const { data } = await serviceClient().from('settings').select('value').eq('key', 'legal_owner').maybeSingle();
    v = (data?.value ?? {}) as Partial<LegalOwner>;
  } catch {
    /* no service key or no row yet: placeholders */
  }
  const f = (x?: string) => (x && x.trim() ? x.trim() : PENDING);
  return { name: f(v.name), nie: f(v.nie), address: f(v.address), email: f(v.email) };
});
