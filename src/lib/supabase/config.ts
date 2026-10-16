// Two independent Supabase sessions live side by side in the browser: one for the shop, one for /admin.
// Different cookie names mean logging in or out of one never touches the other.
export const SHOP_COOKIE = 'hv-shop';
export const ADMIN_COOKIE = 'hv-admin';

export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local');
  return { url, key };
}
