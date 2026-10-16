import Link from 'next/link';
import { btn, btn2, field, PageHead, StatusBadge } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { filterOrders, ORDER_STATUSES } from '@/lib/admin-orders';
import { formatEur } from '@/lib/format';
import { fmtDate, STATUS_LABEL } from '@/lib/orders';

const PAGE = 40;
type SP = { estado?: string; q?: string; vencen?: string; pag?: string; pago?: string };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pag) || 1);
  const { data, count } = await filterOrders(
    db.from('orders').select('number, status, contact_name, contact_email, total_cents, payment_status, shipping_to_confirm, placed_at, due_date, tracking_number', { count: 'exact' }),
    sp,
  )
    .order('placed_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);

  const qs = (extra: Record<string, string>) => new URLSearchParams(Object.entries({ ...sp, ...extra }).filter(([, v]) => v) as [string, string][]).toString();
  const today = new Date().toISOString().slice(0, 10);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  return (
    <>
      <PageHead title="Pedidos">
        <Link href={`/admin/pedidos/exportar?${qs({ pag: '' })}`} className={btn2}>Exportar CSV</Link>
      </PageHead>

      <form method="get" className="mb-6 grid gap-3 rounded-lg border border-line bg-surface p-4 md:grid-cols-[1fr_200px_160px_auto_auto] md:items-end" role="search">
        <label className="block text-sm font-medium">Buscar (número, nombre, email, teléfono)<input name="q" defaultValue={sp.q} className={field} /></label>
        <label className="block text-sm font-medium">Estado
          <select name="estado" defaultValue={sp.estado ?? ''} className={field}>
            <option value="">Todos</option>
            <option value="en_curso">En curso</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Pago
          <select name="pago" defaultValue={sp.pago ?? ''} className={field}>
            <option value="">Todos</option>
            <option value="paid">Pagados</option>
            <option value="unpaid">Sin pagar</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="vencen" value="1" defaultChecked={sp.vencen === '1'} className="h-5 w-5 accent-[var(--firuza-ink)]" /> Vencen pronto / retrasados</label>
        <div className="flex gap-2"><button className={btn}>Filtrar</button><Link href="/admin/pedidos" className={btn2}>Limpiar</Link></div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[820px] text-left text-[15px]">
          <thead className="bg-paper text-sm text-muted">
            <tr><th className="p-3 font-medium">Pedido</th><th className="p-3 font-medium">Cliente</th><th className="p-3 font-medium">Estado</th><th className="p-3 font-medium">Pago</th><th className="p-3 font-medium">Entrega</th><th className="p-3 text-right font-medium">Total</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((o) => {
              const late = o.due_date && o.due_date < today && !['entregado', 'cancelado'].includes(o.status);
              return (
                <tr key={o.number} className="border-t border-line align-top">
                  <td className="p-3"><Link href={`/admin/pedidos/${o.number}`} className="font-mono">{o.number}</Link><span className="block text-xs text-muted">{fmtDate(o.placed_at)}</span></td>
                  <td className="p-3">{o.contact_name}<span className="block text-xs text-muted">{o.contact_email}</span></td>
                  <td className="p-3"><StatusBadge status={o.status} />{o.tracking_number && <span className="mt-1 block text-xs text-muted">Seguimiento: {o.tracking_number}</span>}</td>
                  <td className="p-3">{o.payment_status === 'paid' ? <span className="text-turq">Pagado</span> : <span className="text-muted">Sin pagar</span>}</td>
                  <td className={`p-3 ${late ? 'font-semibold text-madder' : ''}`}>{o.due_date ? fmtDate(o.due_date) : '—'}{late && <span className="block text-xs">Retrasado</span>}</td>
                  <td className="p-3 text-right">{formatEur(o.total_cents)}{o.shipping_to_confirm && <span className="block text-xs text-muted">+ envío</span>}</td>
                </tr>
              );
            })}
            {!data?.length && <tr><td colSpan={6} className="p-6 text-muted">No hay pedidos con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Páginas" className="mt-5 flex items-center gap-4 text-sm">
          {page > 1 && <Link href={`/admin/pedidos?${qs({ pag: String(page - 1) })}`}>← Anterior</Link>}
          <span>Página {page} de {pages} · {count} pedidos</span>
          {page < pages && <Link href={`/admin/pedidos?${qs({ pag: String(page + 1) })}`}>Siguiente →</Link>}
        </nav>
      )}
    </>
  );
}
