import 'server-only';
import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { adminSessionClient } from './supabase/server';

export type AdminState =
  | { status: 'anon' }
  | { status: 'not_admin' }
  | { status: 'needs_mfa_setup'; user: User }
  | { status: 'needs_mfa'; user: User }
  | { status: 'ok'; user: User };

/**
 * State of the ADMIN session (cookie "hv-admin"), which is completely separate from the shop session.
 * "ok" requires: a logged-in user that is listed in admin_users AND whose session passed TOTP (AAL2).
 * The database enforces the same rule again in every RLS policy (public.is_admin()).
 */
export const getAdminState = cache(async (): Promise<AdminState> => {
  const db = await adminSessionClient();
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) return { status: 'anon' };
  const { data: row } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!row) return { status: 'not_admin' };
  const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') return { status: 'ok', user };
  return aal?.nextLevel === 'aal2' ? { status: 'needs_mfa', user } : { status: 'needs_mfa_setup', user };
});

/** Call at the top of EVERY admin page and server action. Redirects unless the full admin check passes. */
export async function requireAdmin() {
  const s = await getAdminState();
  if (s.status === 'anon') redirect('/admin/login');
  if (s.status === 'not_admin') redirect('/admin/login?e=1');
  if (s.status === 'needs_mfa_setup') redirect('/admin/2fa/instalar');
  if (s.status === 'needs_mfa') redirect('/admin/2fa');
  return { db: await adminSessionClient(), user: s.user };
}

/** Append a row to audit_log (RLS only lets an admin insert rows under their own id). */
export async function audit(action: string, entity: string, entityId: string | null, details?: Record<string, unknown>) {
  const { db, user } = await requireAdmin();
  await db.from('audit_log').insert({ admin_id: user.id, action, entity, entity_id: entityId, details: details ?? null });
}
