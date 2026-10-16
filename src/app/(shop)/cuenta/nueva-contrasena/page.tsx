import type { Metadata } from 'next';
import Link from 'next/link';
import { NewPasswordForm } from '@/components/AccountForms';
import { requireShopUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Nueva contraseña', robots: { index: false } };

export default async function NewPasswordPage() {
  await requireShopUser('/cuenta/nueva-contrasena');
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <h1 className="mb-8 text-[clamp(32px,4.6vw,48px)]">Elige tu contraseña</h1>
      <NewPasswordForm title="Contraseña nueva" />
      <p className="mt-6"><Link href="/cuenta">Ir a mi cuenta</Link></p>
    </div>
  );
}
