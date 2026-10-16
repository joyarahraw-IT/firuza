// Home screenshots on :3005 at 375 and 1440 (reduced motion = still necklace)
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const out = (n) => fileURLToPath(new URL(`../screenshots/${n}`, import.meta.url));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const pg = await b.newPage();
  await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]); // still frame
  await pg.setViewport({ width: w, height: h });
  await pg.goto('http://localhost:3005/', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 1500));
  await pg.screenshot({ path: out(`final-home-${w}.png`) });
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
  await new Promise((r) => setTimeout(r, 2000));
  const sec = await pg.evaluateHandle(() => document.querySelector('#categorias').closest('section'));
  await sec.asElement().screenshot({ path: out(`final-tiles-${w}.png`) });
  const cards = await pg.$$('#categorias ~ ul li a');
  console.log(w, 'scrollW', await pg.evaluate(() => document.documentElement.scrollWidth), 'cards', cards.length);
}
await b.close();
