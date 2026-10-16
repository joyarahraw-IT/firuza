import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCheckoutLines, isOnlinePayable } from '../src/lib/payments.ts';
import { computeShipping, DEFAULT_RATES } from '../src/lib/shipping.ts';

const item = (name: string, unit: number, quantity: number, options: Record<string, string> = {}) => ({ name, options, unit_price_cents: unit, quantity });
const order = (over = {}) => ({ total_cents: 5000, shipping_to_confirm: false, shipping_zone: 'spain', order_items: [{ delivery_mode: 'made_to_order' }], ...over });

test('checkout lines add up to subtotal + shipping', () => {
  const { lines, totalCents } = buildCheckoutLines([item('Collar', 4500, 1, { Material: 'Piedra' }), item('Pendientes', 1990, 2)], 490);
  assert.equal(totalCents, 4500 + 2 * 1990 + 490);
  assert.equal(lines.length, 3);
  assert.equal(lines[0].price_data.product_data.description, 'Material: Piedra');
  assert.equal(lines[2].price_data.product_data.name, 'Envío');
  assert.ok(lines.every((l) => l.price_data.currency === 'eur' && Number.isInteger(l.price_data.unit_amount)));
});

test('free shipping (Madrid) adds no shipping line', () => {
  const { lines, totalCents } = buildCheckoutLines([item('Collar', 4500, 1)], 0);
  assert.equal(lines.length, 1);
  assert.equal(totalCents, 4500);
});

test('shipping by zone: Madrid free, Spain 4,90, EU 9,90, islands to confirm, rugs never free', () => {
  const made = [{ mode: 'made_to_order' as const }];
  assert.equal(computeShipping(made, 'ES', '28001', DEFAULT_RATES).cents, 0);
  assert.equal(computeShipping(made, 'ES', '08001', DEFAULT_RATES).cents, 490);
  assert.equal(computeShipping(made, 'FR', '75001', DEFAULT_RATES).cents, 990);
  const isl = computeShipping(made, 'ES', '07001', DEFAULT_RATES);
  assert.equal(isl.cents, 0);
  assert.ok(isl.toConfirm);
  const rug = computeShipping([{ mode: 'shipped' }], 'ES', '28001', DEFAULT_RATES);
  assert.ok(rug.toConfirm);
});

test('only fully priced, non-rug orders are paid online', () => {
  assert.equal(isOnlinePayable(order()), true);
  assert.equal(isOnlinePayable(order({ order_items: [{ delivery_mode: 'made_to_order' }, { delivery_mode: 'shipped' }] })), false); // rug
  assert.equal(isOnlinePayable(order({ shipping_to_confirm: true })), false);
  assert.equal(isOnlinePayable(order({ shipping_zone: 'consult' })), false); // islands: "a consultar"
  assert.equal(isOnlinePayable(order({ total_cents: 0 })), false);
});
