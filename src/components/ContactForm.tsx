'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { sendContact } from '@/app/(shop)/contacto/actions';

const input = 'mt-1.5 block min-h-12 w-full rounded-sm border border-ink-muted bg-ground px-3.5 text-base text-ink';
const lbl = 'block text-[15px] font-medium';

export function ContactForm() {
  const [s, act, pending] = useActionState(sendContact, undefined);
  if (s?.ok) {
    return (
      <div role="status" className="rounded-lg bg-turq-tint p-5 text-turq-dark">
        <p className="font-serif text-2xl">¡Mensaje enviado!</p>
        <p className="mt-1">Te responderemos lo antes posible por email o por WhatsApp.</p>
      </div>
    );
  }
  return (
    <form action={act} key={s?.error ?? 'f'} className="space-y-5">
      <label className={lbl}>Nombre<input name="name" autoComplete="name" required defaultValue={s?.values?.name} className={input} /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={lbl}>Email<input name="email" type="email" autoComplete="email" required defaultValue={s?.values?.email} className={input} /></label>
        <label className={lbl}>Teléfono (opcional)<input name="phone" type="tel" autoComplete="tel" defaultValue={s?.values?.phone} className={input} /></label>
      </div>
      <label className={lbl}>Mensaje<textarea name="message" rows={6} required maxLength={4000} defaultValue={s?.values?.message} className={`${input} py-3`} /></label>
      <div aria-hidden="true" className="absolute -left-[9999px]"><label>Web<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="flex items-start gap-3 text-[15px]">
        <input type="checkbox" name="privacy" required className="mt-1 h-5 w-5 accent-[var(--firuza-ink)]" />
        <span>He leído la <Link href="/privacidad" target="_blank">política de privacidad</Link>.</span>
      </label>
      <div role="alert" aria-live="polite" className="min-h-6">{s?.error && <p className="rounded-lg border border-madder bg-ground p-3 text-madder">{s.error}</p>}</div>
      <button className="btn btn-primary disabled:opacity-60" disabled={pending}>{pending ? 'Enviando…' : 'Enviar mensaje'}</button>
    </form>
  );
}
