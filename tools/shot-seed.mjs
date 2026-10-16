// Home screenshots for the current server: node shot-seed.mjs <name>  (dev server started with DAY_OVERRIDE=<n> as the seed)
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const name = process.argv[2];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const pg = await b.newPage();
  await pg.setViewport({ width: w, height: h });
  await pg.goto('http://localhost:3000/', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 2000));
  console.log(name, w, JSON.stringify(await pg.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('h1').textContent])));
  await pg.screenshot({ path: fileURLToPath(new URL(`../screenshots/home-${name}-${w}.png`, import.meta.url)) });
  if (w === 1440) await pg.screenshot({ path: fileURLToPath(new URL(`../screenshots/home-${name}-1440-full.png`, import.meta.url)), fullPage: true });
}
await b.close();
