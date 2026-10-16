// QA: Lighthouse (mobile + desktop) and responsive screenshots / horizontal-scroll checks with the installed Chrome.
//   node qa.mjs lighthouse     -> scores for the main pages
//   node qa.mjs shots          -> screenshots at 375 / 768 / 1440 + overflow check  (written to ../screenshots)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE ?? 'http://localhost:3005';
const pages = {
  home: '/',
  categoria: '/collares',
  producto: '/producto/collar-largo-azul-marino-flores',
  alfombras: '/alfombras-kilims',
  bolsa: '/bolsa',
  pedido: '/pedido',
  'sobre-mi': '/sobre-mi',
  contacto: '/contacto',
  'aviso-legal': '/aviso-legal',
  entrar: '/cuenta/entrar',
};
const mode = process.argv[2] ?? 'lighthouse';

if (mode === 'lighthouse') {
  const only = process.argv[3] ? process.argv[3].split(',') : Object.keys(pages);
  const chrome = await launch({ chromePath: CHROME, chromeFlags: ['--headless=new', '--no-sandbox'] });
  const rows = [];
  for (const form of ['mobile', 'desktop']) {
    for (const name of only) {
      const flags = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] };
      const config = form === 'desktop' ? { extends: 'lighthouse:default', settings: { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } } } : undefined;
      const res = await lighthouse(BASE + pages[name], flags, config);
      const lhr = res.lhr;
      if (lhr.runtimeError) console.log('  runtimeError', name, lhr.runtimeError.code, lhr.runtimeError.message);
      const sc = (k) => Math.round((lhr.categories[k].score ?? 0) * 100);
      const fails = Object.values(lhr.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual').map((a) => a.id);
      rows.push({ form, name, perf: sc('performance'), a11y: sc('accessibility'), bp: sc('best-practices'), seo: sc('seo'), lcp: Math.round(lhr.audits['largest-contentful-paint'].numericValue ?? NaN), err: lhr.runtimeError?.code, cls: +(lhr.audits['cumulative-layout-shift'].numericValue ?? NaN).toFixed(3), tbt: Math.round(lhr.audits['total-blocking-time'].numericValue), fails });
      console.log(form.padEnd(8), name.padEnd(12), `perf ${rows.at(-1).perf}  a11y ${rows.at(-1).a11y}  bp ${rows.at(-1).bp}  seo ${rows.at(-1).seo}  | LCP ${rows.at(-1).lcp}ms CLS ${rows.at(-1).cls} TBT ${rows.at(-1).tbt}ms`, fails.length ? ' | fails: ' + fails.join(',') : '');
    }
  }
  await chrome.kill();
  fs.writeFileSync(fileURLToPath(new URL('./qa-lighthouse.json', import.meta.url)), JSON.stringify(rows, null, 1));
}

if (mode === 'shots') {
  const out = new URL('../screenshots/', import.meta.url);
  fs.mkdirSync(fileURLToPath(out), { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const sizes = { 375: 812, 768: 1024, 1440: 900 };
  const problems = [];
  for (const [name, path] of Object.entries(pages)) {
    for (const [w, h] of Object.entries(sizes)) {
      const page = await browser.newPage();
      await page.setViewport({ width: +w, height: h, deviceScaleFactor: 1 });
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
      await new Promise((r) => setTimeout(r, 800));
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth,
        wide: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.overflow-x-auto,[class*=overflow-hidden]')).slice(0, 3).map((e) => e.tagName + '.' + String(e.className).slice(0, 50)) }));
      if (m.sw > m.iw) problems.push(`${name} @${w}: horizontal scroll (${m.sw} > ${m.iw}) ${m.wide.join(' | ')}`);
      await page.screenshot({ path: fileURLToPath(new URL(`${name}-${w}.png`, out)), fullPage: true });
      await page.close();
    }
  }
  await browser.close();
  console.log(problems.length ? 'OVERFLOW PROBLEMS:\n' + problems.join('\n') : 'No horizontal scroll at 375 / 768 / 1440 on any page.');
}
