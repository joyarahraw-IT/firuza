'use client';
import { useActionState, useState, useTransition } from 'react';
import { adminLogin, startMfaEnroll, verifyMfa, type AdminFormState } from '@/app/admin/(auth)/actions';

const input = 'mt-1.5 block min-h-12 w-full rounded-sm border border-ink-muted bg-ground px-3.5 text-base text-ink';
const Err = ({ s }: { s: AdminFormState }) => (
  <div role="alert" aria-live="polite" className="min-h-6">{s?.error && <p className="rounded-lg border border-madder bg-ground p-3 text-madder">{s.error}</p>}</div>
);

export function AdminLoginForm() {
  const [s, act, pending] = useActionState(adminLogin, undefined);
  return (
    <form action={act} className="space-y-5">
      <label className="block text-[15px] font-medium">Email<input name="email" type="email" autoComplete="username" required className={input} /></label>
      <label className="block text-[15px] font-medium">Contraseña<input name="password" type="password" autoComplete="current-password" required className={input} /></label>
      <Err s={s} />
      <button className="btn btn-primary w-full disabled:opacity-60" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
    </form>
  );
}

export function MfaCodeForm({ factorId }: { factorId?: string }) {
  const [s, act, pending] = useActionState(verifyMfa, undefined);
  return (
    <form action={act} className="space-y-5">
      {factorId && <input type="hidden" name="factorId" value={factorId} />}
      <label className="block text-[15px] font-medium">Código de 6 dígitos
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus className={`${input} text-center font-mono text-2xl tracking-[0.4em]`} />
      </label>
      <Err s={s} />
      <button className="btn btn-primary w-full disabled:opacity-60" disabled={pending}>{pending ? 'Comprobando…' : 'Verificar'}</button>
    </form>
  );
}

export function MfaSetup() {
  const [data, setData] = useState<AdminFormState>();
  const [pending, start] = useTransition();
  if (!data?.factorId) {
    return (
      <div className="space-y-4">
        <p>Necesitas una app de autenticación (Google Authenticator, Microsoft Authenticator, Authy, 1Password…) en tu móvil.</p>
        <button className="btn btn-primary disabled:opacity-60" disabled={pending} onClick={() => start(async () => setData(await startMfaEnroll()))}>
          {pending ? 'Preparando…' : 'Empezar'}
        </button>
        {data?.error && <p role="alert" className="rounded-lg border border-madder bg-ground p-3 text-madder">{data.error}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <ol className="m-0 list-decimal space-y-2 pl-5">
        <li>Abre tu app de autenticación y añade una cuenta nueva.</li>
        <li>Escanea este código QR (o escribe la clave a mano).</li>
        <li>Escribe el código de 6 dígitos que te muestra la app.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.qr} alt="Código QR para la app de autenticación" width={200} height={200} className="rounded-lg border border-line bg-surface p-2" />
      <p className="text-sm text-muted">Clave manual: <code className="select-all break-all font-mono">{data.secret}</code></p>
      <MfaCodeForm factorId={data.factorId} />
    </div>
  );
}
