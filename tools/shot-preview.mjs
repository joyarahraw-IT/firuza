// Full-page screenshots of the two landing directions (dev server on :3010, light theme, still necklace)
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const out = (n) => fileURLToPath(new URL(`../screenshots/${n}`, import.meta.url));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
for (const dir of ['a', 'b']) {
  for (const [w, h] of [[375, 812], [1440, 900]]) {
    const pg = await b.newPage();
    await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
    await pg.setViewport({ width: w, height: h });
    await pg.goto(`http://localhost:3010/preview/${dir}`, { waitUntil: 'load', timeout: 90000 });
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } scrollTo(0, 0); });
    await new Promise((r) => setTimeout(r, 2500));
    const bad = await pg.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).length);
    console.log(dir, w, 'scrollW', await pg.evaluate(() => document.documentElement.scrollWidth), 'unloaded imgs', bad, 'h1:', await pg.evaluate(() => document.querySelector('h1').textContent.slice(0, 40)));
    await pg.screenshot({ path: out(`preview-${dir}-${w}.png`), fullPage: true });
  }
}
await b.close();
