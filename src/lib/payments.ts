// Pure helpers for online payment (no imports, so they can be unit-tested with `npm test`).
// Prices are NEVER taken from the browser: every figure here comes from the saved order (computed by create_order()).

export type PayOrder = {
  total_cents: number;
  shipping_to_confirm: boolean;
  shipping_zone: string;
  order_items: { delivery_mode: string }[];
};

/** Direct Stripe payment only for fully priced orders. Rugs/kilims (delivery_mode 'shipped') and island destinations ("a consultar") go through the request flow + payment link. */
export function isOnlinePayable(o: PayOrder): boolean {
  if (o.total_cents <= 0 || o.shipping_to_confirm || o.shipping_zone === 'consult') return false;
  return !o.order_items.some((i) => i.delivery_mode === 'shipped');
}

export type LineItem = {
  quantity: number;
  price_data: { currency: 'eur'; unit_amount: number; product_data: { name: string; description?: string } };
};

type Item = { name: string; options: Record<string, string> | null; unit_price_cents: number; quantity: number };

/** Stripe line items from the saved order + the shipping line. The sum always equals subtotal + shipping. */
export function buildCheckoutLines(items: Item[], shippingCents: number): { lines: LineItem[]; totalCents: number } {
  const lines: LineItem[] = items.map((i) => {
    const description = Object.entries(i.options ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
    return {
      quantity: i.quantity,
      price_data: { currency: 'eur', unit_amount: i.unit_price_cents, product_data: { name: i.name, ...(description ? { description } : {}) } },
    };
  });
  if (shippingCents > 0) lines.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: shippingCents, product_data: { name: 'Envío' } } });
  const totalCents = lines.reduce((s, l) => s + l.price_data.unit_amount * l.quantity, 0);
  return { lines, totalCents };
}
