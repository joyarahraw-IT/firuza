// Webhook business logic, separated from Next/Stripe/Supabase so it can be tested (`npm test`).
// Rules: every event is processed once (event id claimed first); an order becomes paid only when Stripe says the money
// arrived AND the amount matches the saved order; expired/failed payments leave the order unpaid so the customer can retry.

export type StripeEventLike = {
  id: string;
  type: string;
  data: { object: { id: string; payment_status?: string; amount_total?: number | null; currency?: string | null; payment_intent?: string | { id: string } | null; metadata?: Record<string, string> | null } };
};

export type OrderRow = { id: string; number: string; status: string; payment_status: string; total_cents: number };

export interface WebhookStore {
  /** true if this event id was not seen before (and is now recorded) */
  claimEvent(id: string, type: string): Promise<boolean>;
  /** forget the event so Stripe's retry is processed again (used when handling failed) */
  releaseEvent(id: string): Promise<void>;
  getOrder(id: string): Promise<OrderRow | null>;
  /** Atomic: only if still unpaid. Sets payment_status, paid_at, stripe ids, status 'pagado' (+ history note). Returns false if it was already paid. */
  markPaid(orderId: string, p: { sessionId: string; paymentIntentId: string | null }): Promise<boolean>;
}

export type WebhookResult = 'paid' | 'duplicate' | 'ignored' | 'unpaid' | 'amount_mismatch' | 'unknown_order';

const PAID_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
const UNPAID_EVENTS = ['checkout.session.expired', 'checkout.session.async_payment_failed'];

export async function processStripeEvent(
  event: StripeEventLike,
  store: WebhookStore,
  onPaid: (orderNumber: string) => Promise<unknown>,
): Promise<WebhookResult> {
  if (!PAID_EVENTS.includes(event.type) && !UNPAID_EVENTS.includes(event.type)) return 'ignored';
  if (!(await store.claimEvent(event.id, event.type))) return 'duplicate';
  try {
    if (UNPAID_EVENTS.includes(event.type)) return 'unpaid'; // order stays unpaid; the customer can retry from their order page

    const s = event.data.object;
    if (s.payment_status !== 'paid') return 'unpaid'; // delayed method (e.g. Bizum pending): wait for async_payment_succeeded
    const orderId = s.metadata?.order_id;
    const order = orderId ? await store.getOrder(orderId) : null;
    if (!order) return 'unknown_order';
    if (s.currency?.toLowerCase() !== 'eur' || s.amount_total !== order.total_cents) {
      console.error('[stripe] amount mismatch', order.number, s.amount_total, order.total_cents);
      return 'amount_mismatch';
    }
    const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null;
    const changed = await store.markPaid(order.id, { sessionId: s.id, paymentIntentId: pi });
    if (!changed) return 'duplicate';
    await onPaid(order.number);
    return 'paid';
  } catch (e) {
    await store.releaseEvent(event.id);
    throw e;
  }
}
