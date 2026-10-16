import type { Product } from './catalog';
import { colorFamily } from './colors';
import { cardPrice } from './pricing';

export type SearchParams = Record<string, string | string[] | undefined>;

export const PRICE_BUCKETS = [
  { id: 'hasta-40', label: 'Hasta 40 €', min: 0, max: 4000 },
  { id: '40-80', label: '40 – 80 €', min: 4000, max: 8000 },
  { id: '80-150', label: '80 – 150 €', min: 8000, max: 15000 },
  { id: 'mas-150', label: 'Más de 150 €', min: 15000, max: Infinity },
] as const;

export const DELIVERY_BUCKETS = [
  { id: 'rapido', label: 'Hecho en 5 días o menos' },
  { id: 'normal', label: 'Hecho en 6–10 días' },
  { id: 'tejida', label: 'Ya tejida (llega en 15–30 días)' },
] as const;

export const SORTS = [
  { id: 'destacados', label: 'Destacados' },
  { id: 'precio-asc', label: 'Precio: de menor a mayor' },
  { id: 'precio-desc', label: 'Precio: de mayor a menor' },
  { id: 'nombre', label: 'Nombre (A–Z)' },
] as const;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const many = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export type Filters = { colors: string[]; price: string; delivery: string; sort: string };
export const parseFilters = (sp: SearchParams): Filters => ({
  colors: many(sp.color),
  price: one(sp.precio) ?? '',
  delivery: one(sp.plazo) ?? '',
  sort: one(sp.orden) ?? 'destacados',
});

const deliveryBucket = (p: Product) =>
  p.delivery_mode === 'shipped' ? 'tejida' : (p.making_days?.[1] ?? 0) <= 5 ? 'rapido' : 'normal';

export const productColorFamilies = (p: Product) => [...new Set(p.colors.map((c) => colorFamily(c.hex)))];

export function applyFilters(products: Product[], f: Filters): Product[] {
  let out = products.filter((p) => {
    if (f.colors.length && !productColorFamilies(p).some((c) => f.colors.includes(c))) return false;
    if (f.price) {
      const b = PRICE_BUCKETS.find((x) => x.id === f.price);
      const c = cardPrice(p).cents;
      if (b && !(c >= b.min && c < b.max)) return false;
    }
    if (f.delivery && deliveryBucket(p) !== f.delivery) return false;
    return true;
  });
  out = [...out];
  if (f.sort === 'precio-asc') out.sort((a, b) => cardPrice(a).cents - cardPrice(b).cents);
  else if (f.sort === 'precio-desc') out.sort((a, b) => cardPrice(b).cents - cardPrice(a).cents);
  else if (f.sort === 'nombre') out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  else out.sort((a, b) => Number(b.featured) - Number(a.featured));
  return out;
}
