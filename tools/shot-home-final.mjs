// Final home checks on the production build (:3005): full-page screenshots, tap targets, dark toggle, overflow
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const out = (n) => fileURLToPath(new URL(`../screenshots/${n}`, import.meta.url));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
for (const [w, h] of [[375, 812], [1440, 900]]) {
  const pg = await b.newPage();
  await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await pg.setViewport({ width: w, height: h });
  await pg.goto('http://localhost:3005/', { waitUntil: 'load' });
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } scrollTo(0, 0); });
  await new Promise((r) => setTimeout(r, 2000));
  const small = await pg.evaluate(() => [...document.querySelectorAll('a, button, summary, input, select')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('.sr-only') && !e.classList.contains('sr-only') && (r.height < 43.5 || r.width < 43.5); }).map((e) => `${e.tagName}:${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 28)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  console.log(w, 'scrollW', await pg.evaluate(() => document.documentElement.scrollWidth), 'small targets:', small.length, small.slice(0, 8));
  console.log(w, 'dev indicator present:', await pg.evaluate(() => !!document.querySelector('nextjs-portal, [data-nextjs-dev-tools-button]')), 'visible product cards:', await pg.evaluate(() => [...document.querySelectorAll('a.lift')].filter((a) => a.offsetParent !== null).length));
  await pg.screenshot({ path: out(`home-final-${w}.png`), fullPage: true });
  if (w === 1440) {
    await pg.click('button[aria-label="Cambiar a modo oscuro"]');
    await new Promise((r) => setTimeout(r, 400));
    console.log('dark toggle ->', await pg.evaluate(() => document.documentElement.dataset.theme), 'bg', await pg.evaluate(() => getComputedStyle(document.body).backgroundColor));
    await pg.evaluate(() => scrollTo(0, 0));
    await pg.screenshot({ path: out('home-final-dark-1440.png'), fullPage: true });
  }
}
await b.close();
