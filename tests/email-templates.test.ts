import assert from 'node:assert/strict';
import { test } from 'node:test';
import { orderConfirmationEmail, ownerOrderEmail, paymentLinkEmail, type EmailOrder } from '../src/lib/email-templates.ts';

const order: EmailOrder = {
  number: 'FZ-261012-ABCD', contact_name: 'Ana <b>', contact_email: 'ana@example.com', contact_phone: '600000000', notes: 'Sin <script>',
  total_cents: 5390, shipping_cents: 490, estimated_from: '2026-10-21', estimated_to: '2026-10-27',
  shipping_address: { line1: 'Calle Sol 1', postal_code: '28001', city: 'Madrid', country: 'ES' },
  order_items: [{ quantity: 1, name: 'Collar azul', options: { Material: 'Piedras' }, line_total_cents: 4900, delivery_mode: 'made_to_order' }],
};

test('templates escape user text and show number and total', () => {
  for (const m of [orderConfirmationEmail(order), orderConfirmationEmail(order, { paid: true }), ownerOrderEmail(order), ownerOrderEmail(order, { paid: true }), paymentLinkEmail(order, 'https://pay.example/x')]) {
    assert.ok(m.html.includes('FZ-261012-ABCD'));
    assert.ok(m.html.includes('53,90 €'));
    assert.ok(!m.html.includes('<script>') && !m.html.includes('Ana <b>'));
    assert.ok(m.subject.includes('FZ-261012-ABCD'));
  }
});

test('paid vs unpaid wording and the payment button', () => {
  assert.match(orderConfirmationEmail(order).html, /Aún no has pagado nada/);
  assert.match(orderConfirmationEmail(order, { paid: true }).html, /Hemos recibido tu pago/);
  assert.match(ownerOrderEmail(order, { paid: true }).subject, /PAGADO/);
  assert.match(paymentLinkEmail(order, 'https://pay.example/x').html, /href="https:\/\/pay\.example\/x"/);
});
