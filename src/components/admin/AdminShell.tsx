import Link from 'next/link';
import { adminLogout } from '@/app/admin/(auth)/actions';

const nav = [
  ['/admin', 'Panel'],
  ['/admin/pedidos', 'Pedidos'],
  ['/admin/productos', 'Productos'],
  ['/admin/clientes', 'Clientes'],
  ['/admin/mensajes', 'Mensajes'],
  ['/admin/resenas', 'Reseñas'],
  ['/admin/fichas', 'Fichas incompletas'],
  ['/admin/fotos', 'Cómo hacer las fotos'],
  ['/admin/ajustes', 'Ajustes'],
] as const;

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[220px_1fr]">
      <aside className="border-b border-line bg-surface text-ink md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <p className="font-display text-2xl font-bold">Firuza</p>
          <p className="label hidden pt-1 text-[10px] text-ink-muted md:block">Administración</p>
        </div>
        <nav aria-label="Administración" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap px-3 py-2.5 text-[15px] text-ink no-underline hover:bg-ground hover:text-ink">{label}</Link>
          ))}
        </nav>
        <div className="hidden px-5 py-6 text-sm md:block">
          <Link href="/" target="_blank" className="text-firuza-ink">Ver la tienda ↗</Link>
          <p className="mt-4 break-all text-ink-muted">{email}</p>
          <form action={adminLogout} className="mt-2"><button className="underline">Cerrar sesión</button></form>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
