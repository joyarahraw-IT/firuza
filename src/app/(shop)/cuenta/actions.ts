'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getShopUser, safeNext } from '@/lib/auth';
import { claimGuestOrders } from '@/lib/claim-orders';
import { isLockedOut, recordAttempt } from '@/lib/ratelimit';
import { SITE_URL } from '@/lib/site';
import { serviceClient, shopClient } from '@/lib/supabase/server';

export type FormState = { ok?: boolean; error?: string; message?: string; values?: Record<string, string> } | undefined;
// React resets a <form action> after it runs: send the typed (non-secret) values back so people do not retype them on an error
const keep = (f: FormData, ...keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(f.get(k) ?? '')]));

const email = z.string().trim().toLowerCase().email('Revisa el email');
const password = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72);
const first = (r: { error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message ?? 'Revisa los datos';
const str = (f: FormData, k: string) => String(f.get(k) ?? '');
const TOO_MANY = 'Demasiados intentos. Espera unos minutos y vuelve a probar.';

// ---------------------------------------------------------------- sign in / up
export async function signInWithPassword(_: FormState, f: FormData): Promise<FormState> {
  const p = z.object({ email, password: z.string().min(1, 'Escribe tu contraseña') }).safeParse({ email: str(f, 'email'), password: str(f, 'password') });
  if (!p.success) return { error: first(p), values: keep(f, 'email') };
  if (await isLockedOut('shop', p.data.email)) return { error: TOO_MANY, values: keep(f, 'email') };
  const db = await shopClient();
  const { data, error } = await db.auth.signInWithPassword(p.data);
  await recordAttempt('shop', p.data.email, !error);
  if (error) {
    return { error: /confirm/i.test(error.message) ? 'Aún no has confirmado tu email. Revisa tu correo.' : 'Email o contraseña incorrectos.', values: keep(f, 'email') };
  }
  if (data.user.email_confirmed_at && data.user.email) await claimGuestOrders(data.user.id, data.user.email);
  redirect(safeNext(str(f, 'next')));
}

export async function sendMagicLink(_: FormState, f: FormData): Promise<FormState> {
  const p = email.safeParse(str(f, 'email'));
  if (!p.success) return { error: first(p), values: keep(f, 'email') };
  if (await isLockedOut('shop', p.data)) return { error: TOO_MANY, values: keep(f, 'email') };
  const db = await shopClient();
  const next = safeNext(str(f, 'next'));
  const { error } = await db.auth.signInWithOtp({ email: p.data, options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` } });
  await recordAttempt('shop', p.data, !error);
  if (error && /rate|seconds|limit/i.test(error.message)) return { error: 'Acabamos de enviarte un enlace. Espera un minuto antes de pedir otro.', values: keep(f, 'email') };
  return { ok: true, message: 'Si el email es válido, te hemos enviado un enlace para entrar. Revisa tu correo (y la carpeta de spam).' };
}

export async function signUp(_: FormState, f: FormData): Promise<FormState> {
  const p = z.object({ name: z.string().trim().min(2, 'Escribe tu nombre').max(120), email, password }).safeParse({ name: str(f, 'name'), email: str(f, 'email'), password: str(f, 'password') });
  if (!p.success) return { error: first(p), values: keep(f, 'name', 'email') };
  if (f.get('accept') !== 'on') return { error: 'Debes aceptar la política de privacidad', values: keep(f, 'name', 'email') };
  if (await isLockedOut('shop', p.data.email)) return { error: TOO_MANY, values: keep(f, 'name', 'email') };
  const db = await shopClient();
  const { data, error } = await db.auth.signUp({
    email: p.data.email, password: p.data.password,
    options: { data: { full_name: p.data.name }, emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(safeNext(str(f, 'next')))}` },
  });
  await recordAttempt('shop', p.data.email, !error);
  if (error) return { error: 'No hemos podido crear la cuenta: ' + error.message, values: keep(f, 'name', 'email') };
  if (data.session) redirect(safeNext(str(f, 'next')));
  return { ok: true, message: 'Cuenta creada. Te hemos enviado un email para confirmarla. Si ya tenías una cuenta con este email, usa «Entrar».' };
}

export async function requestPasswordReset(_: FormState, f: FormData): Promise<FormState> {
  const p = email.safeParse(str(f, 'email'));
  if (!p.success) return { error: first(p) };
  if (await isLockedOut('shop', p.data)) return { error: TOO_MANY };
  const db = await shopClient();
  const { error } = await db.auth.resetPasswordForEmail(p.data, { redirectTo: `${SITE_URL}/auth/callback?next=/cuenta/nueva-contrasena` });
  await recordAttempt('shop', p.data, !error);
  return { ok: true, message: 'Si existe una cuenta con ese email, te hemos enviado un enlace para elegir una contraseña nueva.' };
}

export async function updatePassword(_: FormState, f: FormData): Promise<FormState> {
  const p = password.safeParse(str(f, 'password'));
  if (!p.success) return { error: first(p) };
  if (str(f, 'password') !== str(f, 'confirm')) return { error: 'Las contraseñas no coinciden' };
  const db = await shopClient();
  const { error } = await db.auth.updateUser({ password: p.data });
  if (error) return { error: /same|different/i.test(error.message) ? 'Elige una contraseña distinta de la anterior.' : 'No hemos podido cambiarla. Vuelve a pedir el enlace.' };
  return { ok: true, message: 'Contraseña actualizada.' };
}

export async function signOut() {
  const db = await shopClient();
  await db.auth.signOut({ scope: 'local' }); // only the shop session: the admin session (other cookie) is untouched
  redirect('/');
}

// ---------------------------------------------------------------- profile
export async function updateProfile(_: FormState, f: FormData): Promise<FormState> {
  const user = await getShopUser();
  if (!user) redirect('/cuenta/entrar');
  const p = z.object({ name: z.string().trim().min(2, 'Escribe tu nombre').max(120), phone: z.string().trim().max(40) }).safeParse({ name: str(f, 'name'), phone: str(f, 'phone') });
  if (!p.success) return { error: first(p), values: keep(f, 'name', 'phone') };
  const db = await shopClient();
  const { error } = await db.from('customers').update({ full_name: p.data.name, phone: p.data.phone || null }).eq('id', user.id);
  return error ? { error: 'No hemos podido guardar los cambios.' } : { ok: true, message: 'Datos guardados.' };
}

// ---------------------------------------------------------------- addresses
const Address = z.object({
  label: z.string().trim().max(40).optional(),
  full_name: z.string().trim().min(2, 'Escribe el nombre').max(120),
  phone: z.string().trim().max(40).optional(),
  line1: z.string().trim().min(3, 'Escribe la dirección').max(200),
  line2: z.string().trim().max(200).optional(),
  postal_code: z.string().trim().min(3, 'Escribe el código postal').max(12),
  city: z.string().trim().min(2, 'Escribe la ciudad').max(100),
  province: z.string().trim().max(100).optional(),
  country: z.string().trim().length(2),
});

export async function saveAddress(_: FormState, f: FormData): Promise<FormState> {
  const user = await getShopUser();
  if (!user) redirect('/cuenta/entrar');
  const raw = Object.fromEntries(['label', 'full_name', 'phone', 'line1', 'line2', 'postal_code', 'city', 'province', 'country'].map((k) => [k, str(f, k)]));
  const p = Address.safeParse(raw);
  if (!p.success) return { error: first(p), values: raw as Record<string, string> };
  const row = { ...p.data, label: p.data.label || null, phone: p.data.phone || null, line2: p.data.line2 || null, province: p.data.province || null };
  const db = await shopClient();
  const id = str(f, 'id');
  const { error } = id
    ? await db.from('addresses').update(row).eq('id', id).eq('customer_id', user.id)
    : await db.from('addresses').insert({ ...row, customer_id: user.id, is_default: user.addresses.length === 0 });
  if (error) return { error: 'No hemos podido guardar la dirección.' };
  redirect('/cuenta/direcciones');
}

export async function deleteAddress(f: FormData) {
  const user = await getShopUser();
  if (!user) redirect('/cuenta/entrar');
  const db = await shopClient();
  await db.from('addresses').delete().eq('id', str(f, 'id')).eq('customer_id', user.id);
  redirect('/cuenta/direcciones');
}

export async function makeDefaultAddress(f: FormData) {
  const user = await getShopUser();
  if (!user) redirect('/cuenta/entrar');
  const db = await shopClient();
  await db.from('addresses').update({ is_default: false }).eq('customer_id', user.id);
  await db.from('addresses').update({ is_default: true }).eq('id', str(f, 'id')).eq('customer_id', user.id);
  redirect('/cuenta/direcciones');
}

// ---------------------------------------------------------------- GDPR: delete my account
export async function deleteAccount(_: FormState, f: FormData): Promise<FormState> {
  const user = await getShopUser();
  if (!user) redirect('/cuenta/entrar');
  if (str(f, 'confirm').trim().toUpperCase() !== 'ELIMINAR') return { error: 'Escribe ELIMINAR para confirmar.' };
  if (!process.env.SUPABASE_SECRET_KEY) return { error: 'No podemos eliminar la cuenta desde aquí ahora mismo. Escríbenos y lo hacemos nosotros.' };
  const svc = serviceClient();
  // never delete an owner/admin login through the customer area
  const { data: isAdmin } = await svc.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (isAdmin) return { error: 'Esta cuenta tiene permisos de administración y no se puede eliminar desde aquí.' };
  // deleting the auth user cascades to customers + addresses; orders stay (legal retention) but lose the link to the account
  const { error } = await svc.auth.admin.deleteUser(user.id);
  if (error) return { error: 'No hemos podido eliminar la cuenta. Inténtalo de nuevo o escríbenos.' };
  const db = await shopClient();
  await db.auth.signOut({ scope: 'local' });
  redirect('/cuenta/eliminada');
}

// ---------------------------------------------------------------- reviews (only for delivered orders; the owner approves them)
export async function submitReview(_: FormState, f: FormData): Promise<FormState> {
  const user = await getShopUser();
  if (!user) redirect('/cuenta/entrar');
  const p = z.object({
    order: z.string().uuid(), product: z.string().uuid(),
    rating: z.coerce.number().int().min(1, 'Elige de 1 a 5 estrellas').max(5),
    title: z.string().trim().max(80).optional(),
    body: z.string().trim().min(5, 'Escribe tu opinión (mínimo 5 caracteres)').max(2000),
  }).safeParse({ order: str(f, 'order'), product: str(f, 'product'), rating: str(f, 'rating'), title: str(f, 'title'), body: str(f, 'body') });
  if (!p.success) return { error: first(p), values: keep(f, 'title', 'body', 'rating') };
  const db = await shopClient();
  const { error } = await db.from('reviews').insert({
    product_id: p.data.product, order_id: p.data.order, customer_id: user.id, rating: p.data.rating, title: p.data.title || null, body: p.data.body,
    author_name: (user.fullName || 'Cliente').split(' ')[0].slice(0, 60), status: 'pending',
  });
  if (error) {
    return { error: /duplicate|unique/i.test(error.message) ? 'Ya has dejado una opinión sobre este producto.' : 'No hemos podido guardar tu opinión. Solo se puede opinar sobre pedidos entregados.', values: keep(f, 'title', 'body', 'rating') };
  }
  return { ok: true, message: '¡Gracias! Publicaremos tu opinión cuando la revisemos.' };
}
