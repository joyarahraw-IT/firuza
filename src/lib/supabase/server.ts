import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, SHOP_COOKIE, publicEnv } from './config';

async function sessionClient(cookieName: string) {
  const { url, key } = publicEnv();
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { name: cookieName },
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a Server Component: the proxy refreshes the session instead
        }
      },
    },
  });
}

/** Customer session (shop). Runs with the visitor's own rights, so row level security applies. */
export const shopClient = () => sessionClient(SHOP_COOKIE);

/** Owner session (/admin). Separate cookie; RLS only trusts users listed in admin_users with a TOTP-verified session. */
export const adminSessionClient = () => sessionClient(ADMIN_COOKIE);

/** Cookie-less client for public catalogue reads (anonymous visitor rights, RLS applies). */
export const publicClient = () => {
  const { url, key } = publicEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

/**
 * Service client with the SECRET key: bypasses RLS. Only for trusted server code (seed, GDPR delete, login throttling,
 * emails). Never import this from a client component and never expose it to the browser.
 */
export function serviceClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('SUPABASE_SECRET_KEY is not set in .env.local');
  return createClient(publicEnv().url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
