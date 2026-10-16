import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/AccountForms';
import { getShopUser, safeNext } from '@/lib/auth';

export const metadata: Metadata = { title: 'Crear cuenta', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getShopUser()) redirect(next);
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <h1 className="mb-2 text-[clamp(32px,4.6vw,48px)]">Crear cuenta</h1>
      <p className="mb-8 text-muted">Con tu cuenta ves el estado de tus pedidos y guardas tus direcciones. ¿Ya tienes una? <Link href={`/cuenta/entrar?next=${encodeURIComponent(next)}`}>Entrar</Link>.</p>
      <RegisterForm next={next} />
    </div>
  );
}
