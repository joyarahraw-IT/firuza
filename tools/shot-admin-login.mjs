import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const pg = await b.newPage(); await pg.setViewport({ width: w, height: h });
  await pg.setCookie({ name: 'theme', value: 'dark', url: 'http://localhost:3005' }); // admin must ignore it
  await pg.goto('http://localhost:3005/admin', { waitUntil: 'load' });
  await pg.screenshot({ path: fileURLToPath(new URL(`../screenshots/admin-login-${w}.png`, import.meta.url)) });
  console.log(w, pg.url(), await pg.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor]));
  await pg.close();
}
await b.close();
