import 'server-only';
import { redirect } from 'next/navigation';
import { shopClient } from './supabase/server';

export type Address = {
  id: string;
  label: string | null;
  full_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  postal_code: string;
  city: string;
  province: string | null;
  country: string;
  is_default: boolean;
};
export type ShopUser = { id: string; email: string; fullName: string; phone: string; addresses: Address[] };

/** The logged-in SHOP customer (cookie "hv-shop"), or null. Validated against the Auth server, never trusted from the cookie alone. */
export async function getShopUser(): Promise<ShopUser | null> {
  const db = await shopClient();
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const [{ data: profile }, { data: addresses }] = await Promise.all([
    db.from('customers').select('full_name, phone').eq('id', user.id).maybeSingle(),
    db.from('addresses').select('*').eq('customer_id', user.id).order('is_default', { ascending: false }).order('created_at'),
  ]);
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? '',
    phone: profile?.phone ?? '',
    addresses: (addresses ?? []) as Address[],
  };
}

export async function requireShopUser(next: string): Promise<ShopUser> {
  const u = await getShopUser();
  if (!u) redirect(`/cuenta/entrar?next=${encodeURIComponent(next)}`);
  return u;
}

/** Only same-site relative paths are allowed as a post-login destination (prevents open redirects). */
export const safeNext = (n: string | null | undefined, fallback = '/cuenta') =>
  n && n.startsWith('/') && !n.startsWith('//') && !n.includes('\\') ? n : fallback;
