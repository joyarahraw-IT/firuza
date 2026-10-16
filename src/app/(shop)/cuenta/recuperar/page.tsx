import type { Metadata } from 'next';
import { ResetRequestForm } from '@/components/AccountForms';

export const metadata: Metadata = { title: 'Recuperar contraseña', robots: { index: false } };

export default function ResetPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <h1 className="mb-2 text-[clamp(32px,4.6vw,48px)]">Recuperar contraseña</h1>
      <p className="mb-8 text-muted">Escribe el email de tu cuenta y te enviamos un enlace para elegir una contraseña nueva.</p>
      <ResetRequestForm />
    </div>
  );
}
