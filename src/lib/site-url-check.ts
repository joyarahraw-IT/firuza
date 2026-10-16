// Runs once when the server starts. Warns loudly when NEXT_PUBLIC_SITE_URL points to another port/host than the one we listen on
// (that is how a Stripe Checkout return URL ended up on a dead localhost:3000).
export function checkSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const argv = process.argv;
  const pIdx = argv.findIndex((a) => a === '-p' || a === '--port');
  const running = Number((pIdx >= 0 ? argv[pIdx + 1] : undefined) ?? process.env.PORT ?? 3000);
  if (!configured) {
    console.warn(`[site-url] WARNING: NEXT_PUBLIC_SITE_URL is not set, using http://localhost:3000 but the server listens on port ${running}. Stripe return URLs and email links will be wrong.`);
    return;
  }
  let u: URL;
  try { u = new URL(configured); } catch { console.warn(`[site-url] WARNING: NEXT_PUBLIC_SITE_URL="${configured}" is not a valid URL.`); return; }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  if (local && port !== running) console.warn(`[site-url] WARNING: NEXT_PUBLIC_SITE_URL is ${configured} (port ${port}) but the server listens on port ${running}. Stripe return URLs and email links will point to the wrong server. Fix .env.local and restart.`);
  if (process.env.NODE_ENV === 'production' && local && process.env.VERCEL) console.warn(`[site-url] WARNING: production on Vercel with a localhost NEXT_PUBLIC_SITE_URL (${configured}). Set https://firuza.es.`);
}
