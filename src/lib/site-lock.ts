// Hidden-launch lock (SITE_LOCK=1): HTTP Basic Auth in front of the whole site while it is being tested.
// Pure functions (no imports) so `npm test` can cover them; src/proxy.ts applies the result.

export type LockEnv = { SITE_LOCK?: string; SITE_LOCK_USER?: string; SITE_LOCK_PASSWORD?: string };
export type LockDecision = 'open' | 'allow' | 'challenge' | 'misconfigured';

export const lockEnabled = (env: LockEnv = process.env as LockEnv) => env.SITE_LOCK === '1';

/** Paths that never ask for the password: Stripe's webhook (it cannot send Basic Auth; it is protected by its own signature) and robots.txt (so crawlers read "Disallow: /"). */
export const LOCK_EXEMPT = ['/api/stripe/webhook', '/robots.txt'];
const STATIC_FILE = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|css|js|map|txt|xml)$/i;
export const isLockExempt = (pathname: string) =>
  LOCK_EXEMPT.includes(pathname) || pathname.startsWith('/_next/static/') || pathname.startsWith('/_next/image') || pathname.startsWith('/products/') || STATIC_FILE.test(pathname);

/** Constant-time string comparison (no early exit on the first different character). */
function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function parseBasic(header: string | null): { user: string; password: string } | null {
  if (!header || !/^basic /i.test(header)) return null;
  try {
    const raw = atob(header.slice(6).trim());
    const i = raw.indexOf(':');
    if (i < 0) return null;
    return { user: raw.slice(0, i), password: raw.slice(i + 1) };
  } catch {
    return null;
  }
}

/** 'open' = lock off; 'allow' = exempt path or right credentials; 'challenge' = ask for the password; 'misconfigured' = lock on but no user/password set (fail closed). */
export function siteLockDecision(pathname: string, authorization: string | null, env: LockEnv = process.env as LockEnv): LockDecision {
  if (!lockEnabled(env)) return 'open';
  if (isLockExempt(pathname)) return 'allow';
  if (!env.SITE_LOCK_USER || !env.SITE_LOCK_PASSWORD) return 'misconfigured';
  const c = parseBasic(authorization);
  if (c && safeEqual(c.user, env.SITE_LOCK_USER) && safeEqual(c.password, env.SITE_LOCK_PASSWORD)) return 'allow';
  return 'challenge';
}
