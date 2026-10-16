import { getProducts, getRecentReviews, getSettings, imageUrl, type Product } from '@/lib/catalog';
import { formatEur } from '@/lib/format';
import { seedDay, seededPick } from '@/lib/seed';
import { showWhole } from '@/lib/images';
import { cardPrice, setPrice } from '@/lib/pricing';

export type Photo = { src: string; alt: string; whole?: boolean; slug?: string };

export const cover = (p: Product): Photo => {
  const im = p.images.find((i) => i.cover) ?? p.images[0];
  return { src: imageUrl(im.key), alt: im.alt || p.name, whole: showWhole(im.key), slug: p.slug };
};

export const CATEGORY_BLOCKS = [
  { slug: 'collares', name: 'Collares', block: '--firuza', onBlock: '--on-block' },
  { slug: 'pulseras', name: 'Pulseras', block: '--saffron', onBlock: '--on-block' },
  { slug: 'pendientes', name: 'Pendientes', block: '--granada', onBlock: '--on-block' },
  { slug: 'tejidos-crochet', name: 'Crochet y tejidos', block: '--rosa', onBlock: '--on-block' },
  { slug: 'alfombras-kilims', name: 'Alfombras y kilims', block: '--block-turquesa-ink', onBlock: '--on-block' },
];

export type MosaicTile = {
  key: string;
  href: string;
  label: string;
  photo: Photo;
  /** CSS variable of the pastel the photo is multiplied onto, and of the label dot */
  tile: string;
  dot: string;
  /** category tiles show the category name; product tiles show the product name */
  kind: 'category' | 'product';
};
export type Mosaic = {
  necklace: MosaicTile | null;
  bag: MosaicTile | null;
  earrings: MosaicTile | null;
  /** six photo tiles, fixed slots (the layout never changes, only which products fill it) */
  fill: MosaicTile[];
  count: number;
  minCents: number | null;
};

const TILE_ORDER = ['--tile-turquesa', '--tile-azafran', '--tile-rosa', '--tile-menta', '--tile-crema', '--tile-agua', '--tile-granada'];
const DOT_BY_CAT: Record<string, string> = { collares: '--turquesa', pulseras: '--azafran', pendientes: '--granada', 'tejidos-crochet': '--rosa', 'alfombras-kilims': '--block-turquesa-ink' };

/**
 * The home mosaic: real published products with real photos only. A seed per Europe/Madrid date picks WHICH products appear;
 * the three category tiles (necklace, crochet bag, earrings) always show a product of their own category.
 */
function buildMosaic(all: Product[], real: Product[], day: number): Mosaic {
  const inCat = (slug: string) => real.filter((p) => p.category === slug);
  const tile = (p: Product, i: number, kind: MosaicTile['kind'], label: string): MosaicTile => ({ key: p.slug, href: kind === 'category' ? `/${p.category}` : `/producto/${p.slug}`, label, photo: cover(p), tile: TILE_ORDER[i % TILE_ORDER.length], dot: DOT_BY_CAT[p.category] ?? '--turquesa', kind });
  const one = (list: Product[], seed: string) => seededPick(list, 1, `mosaic-${day}-${seed}`)[0] ?? null;
  const necklace = one(inCat('collares'), 'collares');
  const crochet = inCat('tejidos-crochet');
  const bags = crochet.filter((p) => /bolso|cartera/i.test(p.name));
  const bag = one(bags.length ? bags : crochet, 'crochet');
  const earrings = one(inCat('pendientes'), 'pendientes');
  const used = new Set([necklace, bag, earrings].filter(Boolean).map((p) => p!.slug));
  // six more tiles: one product per category in a seeded order, then a second round, never a product already shown
  const lanes = seededPick(['pulseras', 'collares', 'tejidos-crochet', 'pendientes'], 4, `mosaic-${day}-lanes`)
    .map((c) => seededPick(inCat(c).filter((p) => !used.has(p.slug)), 6, `mosaic-${day}-${c}`));
  const picks: Product[] = [];
  for (let r = 0; picks.length < 6 && lanes.some((l) => r < l.length); r++) for (const l of lanes) if (r < l.length && picks.length < 6) picks.push(l[r]);
  const fill = picks.map((p, i) => tile(p, i + 3, 'product', p.name));
  const mins = all.map((p) => cardPrice(p).cents);
  return {
    necklace: necklace && tile(necklace, 0, 'category', 'Collares'),
    bag: bag && tile(bag, 2, 'category', 'Crochet'),
    earrings: earrings && tile(earrings, 1, 'category', 'Pendientes'),
    fill,
    count: all.length,
    minCents: mins.length ? Math.min(...mins) : null,
  };
}

/** Everything the landing page shows, computed on the server (silent daily-random hero, real photos only). */
export async function getHomeData() {
  const [products, settings, reviews] = await Promise.all([getProducts(), getSettings(), getRecentReviews(3)]);
  const day = seedDay();
  const real = products.filter((p) => !p.needs_real_photo);
  const mosaic = buildMosaic(products, real, day);
  const blocks = CATEGORY_BLOCKS.map((c) => {
    const inCat = products.filter((p) => p.category === c.slug);
    const first = inCat.find((p) => !p.needs_real_photo);
    return { ...c, count: inCat.length, photo: first ? cover(first) : null };
  }).filter((c) => c.count > 0 || c.slug === 'alfombras-kilims');

  const lanes = ['collares', 'tejidos-crochet', 'pulseras', 'pendientes', 'alfombras-kilims'].map((c) => real.filter((p) => p.category === c)).filter((l) => l.length);
  const fresh: Product[] = [];
  for (let i = 0; fresh.length < 8 && lanes.some((l) => i < l.length); i++) for (const l of lanes) if (i < l.length && fresh.length < 8) fresh.push(l[i]);
  const cats = ['collares', 'tejidos-crochet', 'pulseras', 'pendientes'];
  const collageProducts = seededPick(cats.map((c) => seededPick(real.filter((p) => p.category === c), 1, `collage-${day}-${c}`)[0]).filter((p): p is Product => !!p), 3, `collage-${day}`);
  const collage = collageProducts.map(cover);
  // Hafefa's section shows her real work (3 other pieces) until a real photo of her is uploaded in admin
  const rest = real.filter((p) => !collageProducts.includes(p));
  const makerCollage = seededPick(cats.map((c) => seededPick(rest.filter((p) => p.category === c), 1, `maker-${day}-${c}`)[0]).filter((p): p is Product => !!p), 3, `maker-${day}`).map(cover);
  const sets = products.filter((p) => setPrice(p)).sort((a, b) => Number(a.needs_real_photo) - Number(b.needs_real_photo)).slice(0, 4);

  const made = products.filter((p) => p.delivery_mode === 'made_to_order' && p.making_days);
  const mMin = made.length ? Math.min(...made.map((p) => p.making_days![0])) : 2;
  const mMax = made.length ? Math.max(...made.map((p) => p.making_days![1])) : 10;
  const rates = settings.shipping_rates;
  const fee = (c: number) => (c === 0 ? 'gratis' : formatEur(c));
  const ship = settings.shipping;
  const steps = [
    { t: 'Eliges color y medida', d: 'Piedra, perla o acrílico; la talla que uses.' },
    { t: 'Hafefa la hace a mano', d: `entre ${mMin} y ${mMax} días, según la pieza` },
    { t: 'Te llega a casa', d: `${fee(rates.madrid_cents)} en Madrid · ${fee(rates.spain_cents)} España · ${fee(rates.eu_cents)} UE`, d2: `Envío en ${ship.es_min}–${ship.es_max} días laborables (España) o ${ship.eu_min}–${ship.eu_max} (UE)` },
  ];
  return { mosaic, blocks, fresh, collage, makerCollage, sets, steps, reviews, settings, mMin, mMax };
}
