// Real-scroll check + screenshots of home: node shot-scroll.mjs  (fast scroll, then reports images that never loaded)
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const out = (n) => fileURLToPath(new URL(`../screenshots/${n}`, import.meta.url));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const pg = await b.newPage();
  await pg.setViewport({ width: w, height: h });
  await pg.goto('http://localhost:3000/', { waitUntil: 'load' });
  if (w === 1440) await pg.screenshot({ path: out('home-polish-1440.png') });
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
  await new Promise((r) => setTimeout(r, 2500));
  const bad = await pg.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.alt || i.src.slice(-40)));
  console.log(w, 'scrollW', await pg.evaluate(() => document.documentElement.scrollWidth), 'unloaded after fast scroll:', bad.length, bad.slice(0, 5));
  await pg.evaluate(() => scrollTo(0, 0));
  await pg.screenshot({ path: out(`home-polish-${w}-full.png`), fullPage: true });
  if (w === 375) await pg.screenshot({ path: out('home-polish-375.png') });
}
await b.close();
