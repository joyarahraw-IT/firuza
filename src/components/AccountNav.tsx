import Link from 'next/link';
import { signOut } from '@/app/(shop)/cuenta/actions';

const items = [
  ['/cuenta', 'Mis pedidos'],
  ['/cuenta/direcciones', 'Direcciones'],
  ['/cuenta/datos', 'Mis datos'],
] as const;

export function AccountNav({ current, name }: { current: string; name: string }) {
  return (
    <div className="mb-10 border-b border-line pb-5">
      <p className="label text-turq">Mi cuenta</p>
      <h1 className="mt-2 text-[clamp(30px,4vw,44px)]">Hola{name ? `, ${name.split(' ')[0]}` : ''}</h1>
      <nav aria-label="Mi cuenta" className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        {items.map(([href, label]) => (
          <Link key={href} href={href} aria-current={current === href ? 'page' : undefined}
            className={`border-b-2 py-1.5 no-underline ${current === href ? 'border-turq font-semibold text-ink' : 'border-transparent text-turq hover:border-turq-brand'}`}>{label}</Link>
        ))}
        <form action={signOut} className="ml-auto"><button className="text-sm underline">Cerrar sesión</button></form>
      </nav>
    </div>
  );
}
