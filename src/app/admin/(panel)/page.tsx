import Link from 'next/link';
import { Card, PageHead, StatusBadge } from '@/components/admin/ui';
import { emailConfigured } from '@/lib/email';
import { requireAdmin } from '@/lib/admin';
import { formatEur } from '@/lib/format';
import { fmtDate } from '@/lib/orders';

const IN_PROGRESS = ['confirmado', 'pagado', 'en_preparacion', 'enviado'];
const PAID = ['pagado', 'en_preparacion', 'enviado', 'entregado'];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function Dashboard() {
  const { db } = await requireAdmin();
  const today = new Date();
  const soon = new Date(today.getTime() + 2 * 864e5);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [nuevos, enCurso, vencen, ingresos, recientes, productos, mensajes, resenas, ajustes] = await Promise.all([
    db.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'nuevo'),
    db.from('orders').select('id', { count: 'exact', head: true }).in('status', IN_PROGRESS),
    db.from('orders').select('number, due_date, status').not('status', 'in', '(entregado,cancelado)').lte('due_date', iso(soon)).order('due_date'),
    db.from('orders').select('total_cents').in('status', PAID).gte('placed_at', monthStart),
    db.from('orders').select('number, status, contact_name, total_cents, placed_at').order('placed_at', { ascending: false }).limit(8),
    db.from('products').select('slug, name, status, description, care, needs_real_photo, product_images(id)'),
    db.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('settings').select('key, value'),
  ]);

  const revenue = (ingresos.data ?? []).reduce((n, o) => n + o.total_cents, 0);
  const late = (vencen.data ?? []).filter((o) => o.due_date && o.due_date < iso(today)).length;
  const prods = productos.data ?? [];
  const settings = Object.fromEntries((ajustes.data ?? []).map((s) => [s.key, s.value]));
  const confirmar = prods.filter((p) => /\[CONFIRMAR/.test(`${p.name} ${p.description} ${p.care ?? ''}`)).length;

  const todo: { text: string; href: string; n?: number }[] = [
    { text: 'Pedidos nuevos por confirmar', href: '/admin/pedidos?estado=nuevo', n: nuevos.count ?? 0 },
    { text: 'Mensajes sin leer', href: '/admin/mensajes', n: mensajes.count ?? 0 },
    { text: 'Reseñas pendientes de aprobar', href: '/admin/resenas', n: resenas.count ?? 0 },
    { text: 'Productos en borrador (publícalos cuando estén listos)', href: '/admin/productos?estado=draft', n: prods.filter((p) => p.status === 'draft').length },
    { text: 'Productos sin fotos', href: '/admin/productos', n: prods.filter((p) => (p.product_images as unknown[]).length === 0).length },
    { text: 'Productos con textos por confirmar ([CONFIRMAR])', href: '/admin/productos', n: confirmar },
    { text: 'Productos con foto de IA que hay que sustituir por una real', href: '/admin/productos', n: prods.filter((p) => p.needs_real_photo).length },
  ];
  if (/\[CONFIRMAR/.test(JSON.stringify(settings.legal_identity ?? ''))) todo.push({ text: 'Faltan datos legales (domicilio) en Ajustes → Legales', href: '/admin/ajustes#legales', n: 1 });
  if (/\[CONFIRMAR/.test(JSON.stringify(settings.payment ?? ''))) todo.push({ text: 'Confirma los métodos de pago en Ajustes', href: '/admin/ajustes#pagos', n: 1 });
  if (!emailConfigured()) todo.push({ text: 'El email de pedidos no está configurado (RESEND_API_KEY / EMAIL_FROM)', href: '/admin/ajustes', n: 1 });

  const stats = [
    ['Pedidos nuevos', nuevos.count ?? 0, '/admin/pedidos?estado=nuevo'],
    ['En curso', enCurso.count ?? 0, '/admin/pedidos?estado=en_curso'],
    ['Vencen en 2 días o con retraso', vencen.data?.length ?? 0, '/admin/pedidos?vencen=1', late ? `${late} con retraso` : ''],
    ['Ingresos del mes (pagados)', formatEur(revenue), '/admin/pedidos'],
  ] as const;

  return (
    <>
      <PageHead title="Panel" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, href, sub]) => (
          <Link key={label} href={href} className="rounded-lg border border-line bg-surface p-5 text-ink no-underline hover:border-turq">
            <p className="label text-[11px] text-muted">{label}</p>
            <p className="mt-2 font-serif text-4xl">{value}</p>
            {sub && <p className="mt-1 text-sm text-madder">{sub}</p>}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Pedidos recientes">
          {recientes.data?.length ? (
            <table className="w-full text-left text-[15px]">
              <thead className="text-sm text-muted"><tr><th className="pb-2 font-medium">Pedido</th><th className="pb-2 font-medium">Cliente</th><th className="pb-2 font-medium">Estado</th><th className="pb-2 text-right font-medium">Total</th></tr></thead>
              <tbody>
                {recientes.data.map((o) => (
                  <tr key={o.number} className="border-t border-line">
                    <td className="py-2.5"><Link href={`/admin/pedidos/${o.number}`} className="font-mono">{o.number}</Link><span className="block text-xs text-muted">{fmtDate(o.placed_at)}</span></td>
                    <td>{o.contact_name}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-right">{formatEur(o.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-muted">Todavía no hay pedidos.</p>}
        </Card>

        <Card title="Por hacer">
          <ul className="m-0 list-none space-y-2.5 p-0">
            {todo.filter((t) => t.n).map((t) => (
              <li key={t.text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 min-w-6 place-items-center rounded-full bg-saffron/25 px-1.5 text-xs font-semibold text-saffron-text">{t.n}</span>
                <Link href={t.href} className="text-[15px]">{t.text}</Link>
              </li>
            ))}
            {todo.every((t) => !t.n) && <li className="text-muted">Todo al día.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
