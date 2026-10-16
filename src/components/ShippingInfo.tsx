import { formatEur } from '@/lib/format';
import { ZONE_LABEL, type ShippingQuote, type ShippingRates } from '@/lib/shipping';

/** Text for the "Envío" row of the bag / checkout totals. */
export function shippingRow(q: ShippingQuote, rates: ShippingRates): { value: string; note?: string } {
  if (q.zone === 'consult') return { value: 'A consultar', note: rates.consult_label };
  if (!q.hasRegular) return { value: 'A confirmar', note: rates.rug_label };
  const value = q.cents === 0 ? 'Gratis' : formatEur(q.cents);
  return { value, note: q.hasRug ? `Alfombras y kilims: ${rates.rug_label.charAt(0).toLowerCase()}${rates.rug_label.slice(1)}` : undefined };
}

/** Rate card used in the bag before the postal code is known. */
export function ShippingRateList({ rates, showRug }: { rates: ShippingRates; showRug: boolean }) {
  const price = (c: number) => (c === 0 ? 'gratis' : formatEur(c));
  return (
    <ul className="m-0 mt-2 list-none space-y-1 p-0 text-sm text-muted">
      <li>{ZONE_LABEL.madrid}: <strong className="text-ink">{price(rates.madrid_cents)}</strong></li>
      <li>{ZONE_LABEL.spain}: <strong className="text-ink">{price(rates.spain_cents)}</strong></li>
      <li>{ZONE_LABEL.eu}: <strong className="text-ink">{price(rates.eu_cents)}</strong></li>
      <li>{ZONE_LABEL.consult}: <strong className="text-ink">{rates.consult_label.toLowerCase()}</strong></li>
      {showRug && <li className="pt-1">Alfombras y kilims: {rates.rug_label.charAt(0).toLowerCase()}{rates.rug_label.slice(1)}.</li>}
    </ul>
  );
}
