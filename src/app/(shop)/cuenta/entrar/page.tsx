import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/AccountForms';
import { getShopUser, safeNext } from '@/lib/auth';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getShopUser()) redirect(next);
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <h1 className="mb-2 text-[clamp(32px,4.6vw,48px)]">Entrar</h1>
      <p className="mb-8 text-muted">¿Primera vez? <Link href={`/cuenta/registro?next=${encodeURIComponent(next)}`}>Crea tu cuenta</Link>. También puedes <Link href="/bolsa">comprar sin cuenta</Link>.</p>
      {sp.error === 'enlace' && <p role="alert" className="mb-6 rounded-lg border border-madder bg-ground p-3 text-madder">Ese enlace ha caducado o ya se usó. Pide uno nuevo.</p>}
      <LoginForm next={next} />
    </div>
  );
}
