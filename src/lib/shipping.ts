// Shipping cost for display. The DATABASE (create_order) computes the real one from the same settings:
// the browser never sends a shipping cost. Keep this file in sync with supabase/migrations/0006_shipping.sql.
export type Zone = 'madrid' | 'spain' | 'eu' | 'consult';
export type ShippingRates = {
  madrid_cents: number;
  spain_cents: number;
  eu_cents: number;
  consult_label: string;
  rug_label: string;
};
export const DEFAULT_RATES: ShippingRates = {
  madrid_cents: 0,
  spain_cents: 490,
  eu_cents: 990,
  consult_label: 'Envío a consultar',
  rug_label: 'Gastos de envío según tamaño: te los confirmamos antes de pagar',
};

export function shippingZone(country: string, postal: string): Zone {
  if (country.toUpperCase() !== 'ES') return 'eu';
  const p = postal.replace(/\s/g, '').slice(0, 2);
  if (p === '28') return 'madrid';
  if (['07', '35', '38', '51', '52'].includes(p)) return 'consult';
  return 'spain';
}

export type ShippingQuote = {
  zone: Zone;
  cents: number;
  /** true when part of the shipping cost still has to be agreed with the customer (rugs, islands) */
  toConfirm: boolean;
  hasRug: boolean;
  hasRegular: boolean;
};

/** One fee per order, only if it has at least one non-rug item. Rugs/kilims and island destinations are confirmed by the owner. */
export function computeShipping(lines: { mode: 'made_to_order' | 'shipped' }[], country: string, postal: string, rates: ShippingRates): ShippingQuote {
  const zone = shippingZone(country, postal);
  const hasRug = lines.some((l) => l.mode === 'shipped');
  const hasRegular = lines.some((l) => l.mode === 'made_to_order');
  let cents = 0;
  if (hasRegular && zone !== 'consult') cents = zone === 'madrid' ? rates.madrid_cents : zone === 'spain' ? rates.spain_cents : rates.eu_cents;
  return { zone, cents, toConfirm: hasRug || zone === 'consult', hasRug, hasRegular };
}

export const ZONE_LABEL: Record<Zone, string> = {
  madrid: 'Comunidad de Madrid',
  spain: 'Resto de España peninsular',
  eu: 'Resto de la UE',
  consult: 'Baleares, Canarias, Ceuta y Melilla',
};
