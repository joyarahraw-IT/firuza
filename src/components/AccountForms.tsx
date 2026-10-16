'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import {
  deleteAccount, requestPasswordReset, saveAddress, sendMagicLink, signInWithPassword, signUp, updatePassword, updateProfile,
  type FormState,
} from '@/app/(shop)/cuenta/actions';
import { EU_COUNTRIES } from './CheckoutForm';

const input = 'mt-1.5 block min-h-12 w-full rounded-sm border border-ink-muted bg-ground px-3.5 text-base text-ink';
const lbl = 'block text-[15px] font-medium';

function Msg({ s }: { s: FormState }) {
  return (
    <div role="status" aria-live="polite" className="min-h-6">
      {s?.error && <p role="alert" className="rounded-lg border border-madder bg-ground p-3 text-madder">{s.error}</p>}
      {s?.message && <p className="rounded-lg bg-turq-tint p-3 text-turq-dark">{s.message}</p>}
    </div>
  );
}
const Submit = ({ pending, children, tone = 'primary' }: { pending: boolean; children: React.ReactNode; tone?: 'primary' | 'secondary' }) => (
  <button type="submit" disabled={pending} className={`btn ${tone === 'primary' ? 'btn-primary' : 'btn-secondary'} disabled:opacity-60`}>{pending ? 'Un momento…' : children}</button>
);

export function LoginForm({ next }: { next: string }) {
  const [a, doLogin, p1] = useActionState(signInWithPassword, undefined);
  const [b, doLink, p2] = useActionState(sendMagicLink, undefined);
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <form action={doLogin} key={a?.values?.email ?? 'l'} className="space-y-5" aria-label="Entrar con contraseña">
        <h2 className="text-2xl">Entrar con contraseña</h2>
        <input type="hidden" name="next" value={next} />
        <label className={lbl}>Email<input name="email" type="email" autoComplete="email" required defaultValue={a?.values?.email} className={input} /></label>
        <label className={lbl}>Contraseña<input name="password" type="password" autoComplete="current-password" required className={input} /></label>
        <Msg s={a} />
        <div className="flex flex-wrap items-center gap-4"><Submit pending={p1}>Entrar</Submit><Link href="/cuenta/recuperar" className="text-sm">¿Has olvidado tu contraseña?</Link></div>
      </form>
      <form action={doLink} key={b?.values?.email ?? 'm'} className="space-y-5 border-t border-line pt-8 md:border-l md:border-t-0 md:pl-10 md:pt-0" aria-label="Entrar con enlace por email">
        <h2 className="text-2xl">O recibe un enlace</h2>
        <p className="text-muted">Sin contraseña: te enviamos un enlace y entras con un clic.</p>
        <input type="hidden" name="next" value={next} />
        <label className={lbl}>Email<input name="email" type="email" autoComplete="email" required defaultValue={b?.values?.email} className={input} /></label>
        <Msg s={b} />
        <Submit pending={p2} tone="secondary">Enviarme el enlace</Submit>
      </form>
    </div>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [s, act, pending] = useActionState(signUp, undefined);
  return (
    <form action={act} key={s?.values?.email ?? 'r'} className="max-w-md space-y-5">
      <input type="hidden" name="next" value={next} />
      <label className={lbl}>Nombre y apellidos<input name="name" autoComplete="name" required defaultValue={s?.values?.name} className={input} /></label>
      <label className={lbl}>Email<input name="email" type="email" autoComplete="email" required defaultValue={s?.values?.email} className={input} /></label>
      <label className={lbl}>Contraseña (mínimo 8 caracteres)<input name="password" type="password" autoComplete="new-password" minLength={8} required className={input} /></label>
      <label className="flex items-start gap-3 text-[15px]">
        <input type="checkbox" name="accept" required className="mt-1 h-5 w-5 accent-[var(--firuza-ink)]" />
        <span>He leído la <Link href="/privacidad" target="_blank">política de privacidad</Link>.</span>
      </label>
      <Msg s={s} />
      <Submit pending={pending}>Crear cuenta</Submit>
    </form>
  );
}

export function ResetRequestForm() {
  const [s, act, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={act} className="max-w-md space-y-5">
      <label className={lbl}>Email de tu cuenta<input name="email" type="email" autoComplete="email" required className={input} /></label>
      <Msg s={s} />
      <Submit pending={pending}>Enviar enlace</Submit>
    </form>
  );
}

export function NewPasswordForm({ title = 'Nueva contraseña' }: { title?: string }) {
  const [s, act, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={act} className="max-w-md space-y-5">
      <h2 className="text-2xl">{title}</h2>
      <label className={lbl}>Contraseña nueva (mínimo 8 caracteres)<input name="password" type="password" autoComplete="new-password" minLength={8} required className={input} /></label>
      <label className={lbl}>Repítela<input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={input} /></label>
      <Msg s={s} />
      <Submit pending={pending}>Guardar contraseña</Submit>
    </form>
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [s, act, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={act} key={s?.values?.name ?? s?.message ?? 'p'} className="max-w-md space-y-5">
      <h2 className="text-2xl">Mis datos</h2>
      <label className={lbl}>Nombre y apellidos<input name="name" autoComplete="name" required defaultValue={s?.values?.name ?? name} className={input} /></label>
      <label className={lbl}>Teléfono<input name="phone" type="tel" autoComplete="tel" defaultValue={s?.values?.phone ?? phone} className={input} /></label>
      <div className={lbl}>Email<p className="mt-1.5 flex min-h-12 items-center rounded-lg border border-line bg-paper px-3.5 text-base">{email}</p></div>
      <Msg s={s} />
      <Submit pending={pending}>Guardar</Submit>
    </form>
  );
}

export type AddressValues = { id?: string; label?: string | null; full_name?: string; phone?: string | null; line1?: string; line2?: string | null; postal_code?: string; city?: string; province?: string | null; country?: string };
export function AddressForm({ a = {}, fallbackName = '' }: { a?: AddressValues; fallbackName?: string }) {
  const [s, act, pending] = useActionState(saveAddress, undefined);
  return (
    <form action={act} key={s?.error ?? 'a'} className="max-w-xl space-y-5">
      {a.id && <input type="hidden" name="id" value={a.id} />}
      <label className={lbl}>Nombre de la dirección (opcional)<input name="label" defaultValue={s?.values?.label ?? a.label ?? ''} placeholder="Casa, trabajo…" className={input} /></label>
      <label className={lbl}>Nombre y apellidos<input name="full_name" autoComplete="name" required defaultValue={s?.values?.full_name ?? a.full_name ?? fallbackName} className={input} /></label>
      <label className={lbl}>Teléfono<input name="phone" type="tel" autoComplete="tel" defaultValue={s?.values?.phone ?? a.phone ?? ''} className={input} /></label>
      <label className={lbl}>País
        <select name="country" defaultValue={s?.values?.country ?? a.country ?? 'ES'} className={input}>{EU_COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
      </label>
      <label className={lbl}>Dirección<input name="line1" autoComplete="address-line1" required defaultValue={s?.values?.line1 ?? a.line1 ?? ''} className={input} /></label>
      <label className={lbl}>Piso, puerta… (opcional)<input name="line2" autoComplete="address-line2" defaultValue={s?.values?.line2 ?? a.line2 ?? ''} className={input} /></label>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className={lbl}>Código postal<input name="postal_code" autoComplete="postal-code" required defaultValue={s?.values?.postal_code ?? a.postal_code ?? ''} className={input} /></label>
        <label className={`${lbl} sm:col-span-2`}>Ciudad<input name="city" autoComplete="address-level2" required defaultValue={s?.values?.city ?? a.city ?? ''} className={input} /></label>
      </div>
      <label className={lbl}>Provincia (opcional)<input name="province" autoComplete="address-level1" defaultValue={s?.values?.province ?? a.province ?? ''} className={input} /></label>
      <Msg s={s} />
      <div className="flex gap-4"><Submit pending={pending}>Guardar dirección</Submit><Link href="/cuenta/direcciones" className="btn btn-secondary">Cancelar</Link></div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [s, act, pending] = useActionState(deleteAccount, undefined);
  return (
    <details className="rounded-lg border border-madder/40 bg-ground p-5">
      <summary className="cursor-pointer font-serif text-xl text-madder">Eliminar mi cuenta</summary>
      <form action={act} className="mt-4 max-w-xl space-y-4">
        <p>Se borrarán tu cuenta, tus datos de contacto y tus direcciones guardadas. <strong>No se puede deshacer.</strong></p>
        <p className="text-sm text-muted">Los pedidos ya hechos se conservan sin vincular a tu cuenta durante el plazo que exige la ley (facturación y obligaciones fiscales). Si quieres que también anonimicemos esos datos cuando sea legalmente posible, escríbenos.</p>
        <label className={lbl}>Para confirmar, escribe <strong>ELIMINAR</strong>
          <input name="confirm" autoComplete="off" required className={input} />
        </label>
        <Msg s={s} />
        <button type="submit" disabled={pending} className="btn border-anar-deep bg-anar-deep text-on-anar hover:opacity-90 disabled:opacity-60">{pending ? 'Eliminando…' : 'Eliminar mi cuenta definitivamente'}</button>
      </form>
    </details>
  );
}
