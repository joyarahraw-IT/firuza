// End-to-end TEST order on the local server (Stripe TEST mode, test card 4242...). node --env-file=.env.local tools/e2e-order.mjs
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const BASE = process.env.NEXT_PUBLIC_SITE_URL;
const email = process.env.OWNER_EMAIL;
const shot = (n) => fileURLToPath(new URL(`../screenshots/${n}`, import.meta.url));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 1000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await pg.goto(BASE + '/collares', { waitUntil: 'load' });
const href = await pg.$eval('a[href^="/producto/"]', (a) => a.getAttribute('href'));
await pg.goto(BASE + href, { waitUntil: 'load' }); await sleep(800);
const [add] = await pg.$$('xpath/.//button[contains(., "Añadir al pedido")]'); await add.click(); await sleep(800);
await pg.goto(BASE + '/pedido', { waitUntil: 'load' }); await sleep(1000);
const fill = async (name, v) => { await pg.click(`[name="${name}"]`, { clickCount: 3 }); await pg.type(`[name="${name}"]`, v); };
await fill('name', 'Prueba E2E Firuza'); await fill('email', email); await fill('phone', '600123456');
await fill('line1', 'Calle de Prueba 1'); await fill('postal_code', '28001'); await fill('city', 'Madrid');
await pg.click('[name="accept"]');
await pg.screenshot({ path: shot('e2e-1-checkout.png') });
await Promise.all([pg.waitForNavigation({ waitUntil: 'load', timeout: 60000 }), pg.click('button[type="submit"]')]);
console.log('after submit ->', new URL(pg.url()).origin + new URL(pg.url()).pathname);
await sleep(4000); { const [x] = await pg.$$('xpath/.//*[self::button or self::a][contains(., "Pagar sin Link")]'); if (x) { await x.click(); await sleep(2500); } }
await pg.screenshot({ path: shot('e2e-2a-after-submit.png') }); console.log('url now:', pg.url().slice(0, 60));
await pg.waitForSelector('#cardNumber', { timeout: 30000 });
await pg.type('#cardNumber', '4242424242424242'); await pg.type('#cardExpiry', '1234'); await pg.type('#cardCvc', '123');
const nm = await pg.$('#billingName'); if (nm) await pg.type('#billingName', 'Prueba E2E Firuza');
const em = await pg.$('#email'); if (em) { const v = await pg.$eval('#email', (e) => e.value); if (!v) await pg.type('#email', email); }
const country = await pg.$('#billingCountry'); if (country) await pg.select('#billingCountry', 'ES');
const pc = await pg.$('#billingPostalCode'); if (pc) await pg.type('#billingPostalCode', '28001');
await pg.screenshot({ path: shot('e2e-2-stripe.png') });
await pg.click('.SubmitButton');
await pg.waitForFunction(() => location.hostname === 'localhost', { timeout: 90000 });
await sleep(6000);
const u = new URL(pg.url());
console.log('landed ->', u.origin + u.pathname, '| order n =', u.searchParams.get('n'), '| p =', u.searchParams.get('p'));
await pg.screenshot({ path: shot('e2e-3-confirmado.png') });
console.log('page text:', (await pg.$eval('main', (m) => m.innerText)).slice(0, 220).replace(/\s+/g, ' '));
await b.close();
