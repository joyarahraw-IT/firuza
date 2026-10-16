import { MATERIAL_ACRYLIC, MATERIAL_STONE, type Product } from './catalog';

export type CardPrice = {
  cents: number;
  from: boolean;
  acrylic: { cents: number; from: boolean } | null;
};

/**
 * What a product card shows. The base price leads (never the acrylic one); "Desde" appears only when sizes or models
 * change the base price. The "Conjunto" option (necklace + earrings) is an add-on, not a model, so it is ignored here.
 */
export function cardPrice(p: Product): CardPrice {
  const base = p.variants.filter((v) => v.options['Conjunto'] === undefined || v.options['Conjunto'] === 'Solo collar');
  const hasMaterial = base.some((v) => v.options['Material'] !== undefined);
  const main = hasMaterial ? base.filter((v) => v.options['Material'] === MATERIAL_STONE) : base;
  const acr = hasMaterial ? base.filter((v) => v.options['Material'] === MATERIAL_ACRYLIC) : [];
  const range = (vs: typeof base) => {
    const c = vs.map((v) => v.price_cents);
    return { min: Math.min(...c), from: Math.min(...c) !== Math.max(...c) };
  };
  const m = range(main.length ? main : base);
  const a = acr.length ? range(acr) : null;
  return { cents: m.min, from: m.from, acrylic: a ? { cents: a.min, from: a.from } : null };
}

/** Acrylic = stone / 6, rounded to the nearest x.90, minimum 5.90 (owner rule, editable in admin). */
export const acrylicFromStone = (stoneCents: number) => {
  const eur = stoneCents / 100 / 6;
  return Math.max(590, Math.round((Math.round(eur - 0.9) + 0.9) * 100));
};

/** Price of the "collar + pendientes" set (stone material when the product has a material choice), or null if the product has no set option. */
export function setPrice(p: Product): { cents: number; soloCents: number } | null {
  const sets = p.variants.filter((v) => v.options['Conjunto'] !== undefined && v.options['Conjunto'] !== 'Solo collar');
  if (!sets.length) return null;
  const hasMaterial = sets.some((v) => v.options['Material'] !== undefined);
  const pool = hasMaterial ? sets.filter((v) => v.options['Material'] === MATERIAL_STONE) : sets;
  if (!pool.length) return null;
  return { cents: Math.min(...pool.map((v) => v.price_cents)), soloCents: cardPrice(p).cents };
}
