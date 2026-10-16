import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { serviceClient } from './supabase/server';

const WINDOW_MIN = 15;
const MAX_FAILS = 8;

async function keyFor(identity: string) {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? 'local').split(',')[0].trim();
  return createHash('sha256').update(`${ip}|${identity.toLowerCase()}`).digest('hex').slice(0, 32);
}

const enabled = () => !!process.env.SUPABASE_SECRET_KEY;

/** true when this ip+identity made too many failed attempts recently. Table login_attempts is service-role only. */
export async function isLockedOut(scope: 'shop' | 'admin', identity: string): Promise<boolean> {
  if (!enabled()) return false;
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await serviceClient()
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('scope', scope)
    .eq('key', await keyFor(identity))
    .eq('success', false)
    .gte('created_at', since);
  return (count ?? 0) >= MAX_FAILS;
}

export async function recordAttempt(scope: 'shop' | 'admin', identity: string, success: boolean) {
  if (!enabled()) return;
  await serviceClient().from('login_attempts').insert({ scope, key: await keyFor(identity), success });
}
