import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteCustomer } from '../actions';
import { btn2, btnDanger, Card, Notice, PageHead, StatusBadge, waPhone } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { formatEur } from '@/lib/format';
import { fmtDate } from '@/lib/orders';

export default async function CustomerAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const { id } = await params;
  const { err } = await searchParams;
  const { db } = await requireAdmin();
  const { data: c } = await db.from('customers').select('*').eq('id', id).maybeSingle();
  if (!c) notFound();
  const [{ data: addresses }, { data: orders }] = await Promise.all([
    db.from('addresses').select('*').eq('customer_id', id).order('is_default', { ascending: false }),
    db.from('orders').select('number, status, total_cents, placed_at').eq('customer_id', id).order('placed_at', { ascending: false }),
  ]);
  return (
    <>
      <PageHead title={c.full_name || c.email} back={{ href: '/admin/clientes', label: 'Clientes' }}>
        <a href={`/admin/clientes/${id}/exportar`} className={btn2} download>Exportar datos (RGPD)</a>
        {c.phone && <a href={`https://wa.me/${waPhone(c.phone)}`} target="_blank" rel="noopener" className={btn2}>WhatsApp</a>}
        <a href={`mailto:${c.email}`} className={btn2}>Email</a>
      </PageHead>
      {err && <Notice kind="error">{err}</Notice>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Datos"><p>{c.full_name ?? '—'}<br />{c.email}<br />{c.phone ?? 'Sin teléfono'}</p><p className="mt-3 text-sm text-muted">Alta: {fmtDate(c.created_at)}</p></Card>
        <Card title="Direcciones">
          {addresses?.length ? <ul className="m-0 list-none space-y-3 p-0">{addresses.map((a) => <li key={a.id} className="text-[15px]">{a.label && <strong>{a.label}{a.is_default ? ' (principal)' : ''}<br /></strong>}{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.postal_code} {a.city}, {a.country}</li>)}</ul> : <p className="text-muted">Sin direcciones guardadas.</p>}
        </Card>
        <Card title="Pedidos" className="xl:col-span-2">
          {orders?.length ? (
            <table className="w-full text-left text-[15px]"><tbody>
              {orders.map((o) => <tr key={o.number} className="border-t border-line first:border-0"><td className="py-2.5"><Link href={`/admin/pedidos/${o.number}`} className="font-mono">{o.number}</Link></td><td>{fmtDate(o.placed_at)}</td><td><StatusBadge status={o.status} /></td><td className="text-right">{formatEur(o.total_cents)}</td></tr>)}
            </tbody></table>
          ) : <p className="text-muted">Sin pedidos vinculados a la cuenta.</p>}
        </Card>
        <Card title="Eliminar cliente (RGPD)" className="xl:col-span-2">
          <p className="mb-4 max-w-[70ch] text-sm text-muted">Borra la cuenta, el perfil y las direcciones. Los pedidos se conservan sin vínculo con la cuenta (obligaciones legales). Descarga antes el JSON si el cliente lo pide.</p>
          <form action={deleteCustomer} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={id} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="h-5 w-5 accent-[var(--anar-deep)]" /> Sí, eliminar definitivamente</label>
            <button className={btnDanger}>Eliminar cliente</button>
          </form>
        </Card>
      </div>
    </>
  );
}
