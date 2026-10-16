'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getAdminState } from '@/lib/admin';
import { isLockedOut, recordAttempt } from '@/lib/ratelimit';
import { adminSessionClient } from '@/lib/supabase/server';

export type AdminFormState = { error?: string; ok?: boolean; factorId?: string; qr?: string; secret?: string } | undefined;
const GENERIC = 'Email o contraseña incorrectos.';

export async function adminLogin(_: AdminFormState, f: FormData): Promise<AdminFormState> {
  const p = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }).safeParse({
    email: String(f.get('email') ?? ''), password: String(f.get('password') ?? ''),
  });
  if (!p.success) return { error: GENERIC };
  if (await isLockedOut('admin', p.data.email)) return { error: 'Demasiados intentos. Espera 15 minutos.' };

  const db = await adminSessionClient();
  const { data, error } = await db.auth.signInWithPassword(p.data);
  if (error || !data.user) {
    await recordAttempt('admin', p.data.email, false);
    return { error: GENERIC };
  }
  // A customer account must never end up with an admin session: no row in admin_users -> drop the session at once.
  const { data: row } = await db.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (!row) {
    await db.auth.signOut({ scope: 'local' });
    await recordAttempt('admin', p.data.email, false);
    return { error: GENERIC };
  }
  await recordAttempt('admin', p.data.email, true);
  redirect('/admin');
}

export async function adminLogout() {
  const db = await adminSessionClient();
  await db.auth.signOut({ scope: 'local' }); // only the admin cookie: the shop session is untouched
  redirect('/admin/login');
}

/** Step 1 of 2FA setup: create a TOTP factor and return the QR code + secret to show once. */
export async function startMfaEnroll(): Promise<AdminFormState> {
  const s = await getAdminState();
  if (s.status !== 'needs_mfa_setup') return { error: 'No se puede configurar el 2FA ahora.' };
  const db = await adminSessionClient();
  // drop half-finished attempts so they do not pile up
  const { data: factors } = await db.auth.mfa.listFactors();
  for (const fa of factors?.all ?? []) if (fa.status === 'unverified') await db.auth.mfa.unenroll({ factorId: fa.id });
  const { data, error } = await db.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Firuza ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { error: 'No se pudo iniciar el 2FA: ' + (error?.message ?? 'error desconocido') + '. Comprueba que el MFA (TOTP) está activado en Supabase.' };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Verifies a 6-digit code. Used both to finish the enrolment and for every later login (upgrades the session to AAL2). */
export async function verifyMfa(_: AdminFormState, f: FormData): Promise<AdminFormState> {
  const code = String(f.get('code') ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return { error: 'Escribe los 6 dígitos del código.' };
  const s = await getAdminState();
  if (s.status !== 'needs_mfa' && s.status !== 'needs_mfa_setup') redirect('/admin');
  const key = s.user.email ?? 'admin';
  if (await isLockedOut('admin', key)) return { error: 'Demasiados intentos. Espera 15 minutos.' };

  const db = await adminSessionClient();
  const factorId = String(f.get('factorId') ?? '') || (await db.auth.mfa.listFactors()).data?.totp?.[0]?.id;
  if (!factorId) return { error: 'No hay ningún factor configurado.' };
  const { data: ch, error: e1 } = await db.auth.mfa.challenge({ factorId });
  if (e1 || !ch) return { error: 'No se pudo comprobar el código. Inténtalo de nuevo.' };
  const { error: e2 } = await db.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  await recordAttempt('admin', key, !e2);
  if (e2) return { error: 'Código incorrecto o caducado.' };
  redirect('/admin');
}
