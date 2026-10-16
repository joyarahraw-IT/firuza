import assert from 'node:assert/strict';
import { test } from 'node:test';
import { processStripeEvent, type OrderRow, type StripeEventLike, type WebhookStore } from '../src/lib/stripe-webhook.ts';

function fakeStore(order: OrderRow) {
  const seen = new Set<string>();
  const state = { ...order, markPaidCalls: 0, failMarkPaid: false };
  const store: WebhookStore = {
    async claimEvent(id) { if (seen.has(id)) return false; seen.add(id); return true; },
    async releaseEvent(id) { seen.delete(id); },
    async getOrder(id) { return id === state.id ? { ...state } : null; },
    async markPaid() {
      if (state.failMarkPaid) throw new Error('db down');
      state.markPaidCalls++;
      if (state.payment_status === 'paid') return false;
      state.payment_status = 'paid'; state.status = 'pagado';
      return true;
    },
  };
  return { store, state };
}
const base: OrderRow = { id: 'o1', number: 'FZ-261012-ABCD', status: 'pendiente_pago', payment_status: 'unpaid', total_cents: 5390 };
const evt = (type: string, over: Record<string, unknown> = {}, id = 'evt_1'): StripeEventLike => ({
  id, type,
  data: { object: { id: 'cs_1', payment_status: 'paid', amount_total: 5390, currency: 'eur', payment_intent: 'pi_1', metadata: { order_id: 'o1' }, ...over } },
});

test('paid: marks the order paid and sends the confirmation once', async () => {
  const { store, state } = fakeStore(base);
  const sent: string[] = [];
  assert.equal(await processStripeEvent(evt('checkout.session.completed'), store, async (n) => { sent.push(n); }), 'paid');
  assert.equal(state.payment_status, 'paid');
  assert.equal(state.status, 'pagado');
  assert.deepEqual(sent, ['FZ-261012-ABCD']);
});

test('duplicate event (same id, or a new id for an already-paid order): no second email', async () => {
  const { store, state } = fakeStore(base);
  const sent: string[] = [];
  const onPaid = async (n: string) => { sent.push(n); };
  await processStripeEvent(evt('checkout.session.completed'), store, onPaid);
  assert.equal(await processStripeEvent(evt('checkout.session.completed'), store, onPaid), 'duplicate'); // Stripe resend
  assert.equal(await processStripeEvent(evt('checkout.session.async_payment_succeeded', {}, 'evt_2'), store, onPaid), 'duplicate'); // different event, same order
  assert.equal(sent.length, 1);
  assert.equal(state.markPaidCalls, 2); // the second attempt was a no-op in the store
});

test('failed / expired payment keeps the order unpaid', async () => {
  for (const type of ['checkout.session.expired', 'checkout.session.async_payment_failed']) {
    const { store, state } = fakeStore(base);
    let emailed = false;
    assert.equal(await processStripeEvent(evt(type, { payment_status: 'unpaid' }), store, async () => { emailed = true; }), 'unpaid');
    assert.equal(state.payment_status, 'unpaid');
    assert.equal(state.status, 'pendiente_pago');
    assert.equal(emailed, false);
  }
});

test('Bizum still pending (completed but unpaid) does not mark the order paid', async () => {
  const { store, state } = fakeStore(base);
  assert.equal(await processStripeEvent(evt('checkout.session.completed', { payment_status: 'unpaid' }), store, async () => {}), 'unpaid');
  assert.equal(state.payment_status, 'unpaid');
});

test('wrong amount or unknown order is never marked paid', async () => {
  const a = fakeStore(base);
  assert.equal(await processStripeEvent(evt('checkout.session.completed', { amount_total: 100 }), a.store, async () => {}), 'amount_mismatch');
  assert.equal(a.state.payment_status, 'unpaid');
  const b = fakeStore(base);
  assert.equal(await processStripeEvent(evt('checkout.session.completed', { metadata: { order_id: 'nope' } }), b.store, async () => {}), 'unknown_order');
});

test('a processing error releases the event so the Stripe retry works', async () => {
  const { store, state } = fakeStore(base);
  state.failMarkPaid = true;
  await assert.rejects(processStripeEvent(evt('checkout.session.completed'), store, async () => {}));
  state.failMarkPaid = false;
  assert.equal(await processStripeEvent(evt('checkout.session.completed'), store, async () => {}), 'paid');
});

test('unrelated events are ignored', async () => {
  const { store } = fakeStore(base);
  assert.equal(await processStripeEvent(evt('customer.created'), store, async () => {}), 'ignored');
});
