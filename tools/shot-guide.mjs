// Screenshots: product page (with Medidas), size-guide dialog, /guia-de-tallas at 375 and 1440 (light theme)
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const out = (n) => fileURLToPath(new URL(`../screenshots/${n}`, import.meta.url));
const slug = process.argv[2] ?? 'collar-largo-azul-marino-flores';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
for (const [w, h] of [[375, 812], [1440, 900]]) {
  const pg = await b.newPage();
  await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await pg.setViewport({ width: w, height: h });
  await pg.goto(`http://localhost:3000/producto/${slug}`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 1200));
  const sec = await pg.$('#medidas');
  console.log(w, 'medidas block', !!sec, 'scrollW', await pg.evaluate(() => document.documentElement.scrollWidth));
  if (sec) { await sec.evaluate((e) => e.scrollIntoView({ block: 'center' })); await new Promise((r) => setTimeout(r, 800)); }
  await pg.screenshot({ path: out(`guide-product-${w}.png`) });
  const btn = await pg.evaluateHandle(() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Guía de tallas'));
  await btn.asElement().click();
  await new Promise((r) => setTimeout(r, 600));
  await pg.screenshot({ path: out(`guide-dialog-${w}.png`) });
  await pg.keyboard.press('Escape');
  const g = await b.newPage();
  await g.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await g.setViewport({ width: w, height: h });
  await g.goto('http://localhost:3000/guia-de-tallas', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 1000));
  console.log(w, 'guia scrollW', await g.evaluate(() => document.documentElement.scrollWidth));
  await g.screenshot({ path: out(`guia-de-tallas-${w}.png`), fullPage: true });
}
await b.close();
