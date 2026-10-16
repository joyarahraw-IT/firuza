// Renders every email template to screenshots/emails/*.html (+ png) with sample data. node tools/render-emails.mjs
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
const T = await import(pathToFileURL(fileURLToPath(new URL('../src/lib/email-templates.ts', import.meta.url))).href);
const dir = fileURLToPath(new URL('../screenshots/emails/', import.meta.url));
fs.mkdirSync(dir, { recursive: true });
const order = {
  number: 'FZ-261014-K7Q2', contact_name: 'Lucía Martín', contact_email: 'lucia@example.com', contact_phone: '+34 600 111 222', notes: 'Si puede ser, en tonos azules.',
  total_cents: 5890, shipping_cents: 490, shipping_zone: 'spain', shipping_to_confirm: false, estimated_from: '2026-10-21', estimated_to: '2026-10-27',
  shipping_address: { line1: 'Calle del Sol 12, 3º B', postal_code: '28012', city: 'Madrid', province: 'Madrid', country: 'España' },
  order_items: [
    { quantity: 1, name: 'Collar azul y dorado con gotas', options: { Material: 'Piedras, perlas y cristal', Conjunto: 'Solo collar' }, line_total_cents: 5200, delivery_mode: 'made_to_order' },
    { quantity: 1, name: 'Pulsera negra y amarilla', options: {}, line_total_cents: 200, delivery_mode: 'made_to_order' },
  ],
};
const mails = {
  'pedido-recibido': T.orderConfirmationEmail(order),
  'pago-recibido': T.orderConfirmationEmail(order, { paid: true }),
  'aviso-dueno-nuevo': T.ownerOrderEmail(order),
  'aviso-dueno-pagado': T.ownerOrderEmail(order, { paid: true }),
  'enlace-de-pago': T.paymentLinkEmail({ ...order, shipping_cents: 1500, total_cents: 21500 }, 'https://checkout.stripe.com/c/pay/cs_test_example'),
  'mensaje-contacto': T.contactEmail({ name: 'Lucía', email: 'lucia@example.com', message: 'Hola, ¿hacéis collares a medida?' }),
};
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
for (const [n, m] of Object.entries(mails)) {
  fs.writeFileSync(dir + n + '.html', m.html);
  const pg = await b.newPage(); await pg.setViewport({ width: 700, height: 800 });
  await pg.setContent(m.html); await pg.screenshot({ path: dir + n + '.png', fullPage: true }); await pg.close();
  console.log(n, '|', m.subject);
}
await b.close();
