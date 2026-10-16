'use server';
import { z } from 'zod';
import { sendContactNotification } from '@/lib/email';
import { isLockedOut, recordAttempt } from '@/lib/ratelimit';
import { shopClient } from '@/lib/supabase/server';

export type ContactState = { ok?: boolean; error?: string; values?: Record<string, string> } | undefined;

const Msg = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre').max(120),
  email: z.string().trim().email('Revisa el email').max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(5, 'Escribe tu mensaje').max(4000),
  website: z.string().max(0), // honeypot
  privacy: z.literal('on', { message: 'Debes aceptar la política de privacidad' }),
});

export async function sendContact(_: ContactState, f: FormData): Promise<ContactState> {
  const raw = Object.fromEntries(['name', 'email', 'phone', 'message', 'website', 'privacy'].map((k) => [k, String(f.get(k) ?? '')]));
  const keep = { name: raw.name, email: raw.email, phone: raw.phone, message: raw.message };
  const p = Msg.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0].message, values: keep };
  // simple throttle: at most 8 messages per IP in 15 minutes
  if (await isLockedOut('shop', 'contact-form')) return { error: 'Has enviado muchos mensajes seguidos. Inténtalo en unos minutos o escríbenos por WhatsApp.', values: keep };
  await recordAttempt('shop', 'contact-form', false);
  const db = await shopClient();
  const { error } = await db.from('contact_messages').insert({ name: p.data.name, email: p.data.email, phone: p.data.phone || null, message: p.data.message });
  if (error) return { error: 'No hemos podido enviar el mensaje. Escríbenos por WhatsApp o email.', values: keep };
  await sendContactNotification({ name: p.data.name, email: p.data.email, phone: p.data.phone, message: p.data.message });
  return { ok: true };
}
