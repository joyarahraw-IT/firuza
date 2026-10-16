// Silent daily seed (Europe/Madrid date). Nothing on the page says which "day" it is: the seed only decides WHICH real products
// the home mosaic shows (the layout is fixed), so every visitor sees the same mosaic all day and the cache works per day.
/** FNV-1a: small, stable string hash. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const madridDate = (now: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(now); // YYYY-MM-DD

/** Day number since 2026-01-01 in Madrid, or the DAY_OVERRIDE seed (local dev only, never in production). */
export function seedDay(now = new Date()): number {
  const forced = process.env.NODE_ENV !== 'production' ? Number(process.env.DAY_OVERRIDE) : NaN;
  if (Number.isInteger(forced) && forced >= 0) return forced;
  const [y, m, d] = madridDate(now).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
}

/** Seeded, order-stable pick of n distinct items. */
export function seededPick<T>(items: T[], n: number, seed: string): T[] {
  return items
    .map((it, i) => ({ it, k: hash(`${seed}-${i}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.it);
}
