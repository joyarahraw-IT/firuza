// Screenshots + measurements of the home mosaic on the server at :3005. node tools/shot-mosaic.mjs [dark]
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const dark = process.argv[2] === 'dark';
const out = (n) => fileURLToPath(new URL(`../screenshots/${n}`, import.meta.url));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const lum = (c) => { const [r, g, bl] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
const cr = (a, c) => { const x = lum(a), y = lum(c); return ((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
  const pg = await b.newPage();
  await pg.setViewport({ width: w, height: h });
  if (dark) await pg.setCookie({ name: 'theme', value: 'dark', url: 'http://localhost:3005' });
  await pg.goto('http://localhost:3005/', { waitUntil: 'load', timeout: 90000 });
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
  await new Promise((r) => setTimeout(r, 2000));
  const info = await pg.evaluate(() => {
    const m = document.querySelector('.mosaic').getBoundingClientRect();
    const tiles = [...document.querySelectorAll('.mosaic > .tile')].map((t) => { const r = t.getBoundingClientRect(); const cs = getComputedStyle(t); return { c: t.className.replace('tile ', '').replace(' fit-contain', ''), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, color: cs.color, vis: cs.display !== 'none' }; });
    return { sw: document.documentElement.scrollWidth, mosaic: [Math.round(m.width), Math.round(m.height)], tiles, imgs: [...document.querySelectorAll('.mosaic img')].map((i) => [i.getAttribute('fetchpriority'), i.loading]), h1: document.querySelector('h1').textContent };
  });
  console.log(w, 'scrollWidth', info.sw, 'mosaic', info.mosaic.join('x'), 'h1', info.h1);
  for (const t of info.tiles.filter((t) => t.vis)) console.log('  ', t.c.padEnd(8), `${t.w}x${t.h}@${t.x},${t.y}`, t.bg, t.c.match(/m-(text|cta)/) ? 'contrast ' + cr(t.color, t.bg) : '');
  console.log('   imgs', JSON.stringify(info.imgs));
  await pg.screenshot({ path: out(`home-mosaic-${w}${dark ? '-dark' : ''}.png`), fullPage: true });
  await pg.close();
}
await b.close();
