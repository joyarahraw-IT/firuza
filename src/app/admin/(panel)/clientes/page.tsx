import Link from 'next/link';
import { btn, btn2, field, PageHead } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { formatEur } from '@/lib/format';
import { serviceClient } from '@/lib/supabase/server';
import { fmtDate } from '@/lib/orders';

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string }> }) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const [{ data: customers }, { data: orders }] = await Promise.all([
    db.from('customers').select('id, email, full_name, phone, created_at').order('created_at', { ascending: false }).limit(1000),
    db.from('orders').select('customer_id, total_cents, status').not('customer_id', 'is', null),
  ]);
  const stats = new Map<string, { n: number; total: number }>();
  for (const o of orders ?? []) {
    if (o.status === 'cancelado') continue;
    const s = stats.get(o.customer_id) ?? { n: 0, total: 0 };
    s.n++; s.total += o.total_cents;
    stats.set(o.customer_id, s);
  }
  // owner/admin logins also get a profile row from the signup trigger: they are not customers
  const adminIds = new Set(process.env.SUPABASE_SECRET_KEY ? ((await serviceClient().from('admin_users').select('user_id')).data ?? []).map((a) => a.user_id) : []);
  const q = (sp.q ?? '').toLowerCase().trim();
  const rows = (customers ?? []).filter((c) => !adminIds.has(c.id)).filter((c) => !q || `${c.email} ${c.full_name ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(q));
  return (
    <>
      <PageHead title="Clientes" />
      {sp.ok === 'eliminado' && <p role="status" className="mb-5 rounded-lg bg-turq-tint p-3 text-turq-dark">Cliente eliminado.</p>}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4" role="search">
        <label className="block min-w-64 flex-1 text-sm font-medium">Buscar<input name="q" defaultValue={sp.q} className={field} /></label>
        <button className={btn}>Buscar</button><Link href="/admin/clientes" className={btn2}>Limpiar</Link>
      </form>
      <p className="mb-3 text-sm text-muted">{rows.length} clientes registrados. Los pedidos como invitado aparecen solo en Pedidos.</p>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead className="bg-paper text-sm text-muted"><tr><th className="p-3 font-medium">Cliente</th><th className="p-3 font-medium">Teléfono</th><th className="p-3 font-medium">Alta</th><th className="p-3 text-right font-medium">Pedidos</th></tr></thead>
          <tbody>
            {rows.map((c) => {
              const s = stats.get(c.id);
              return (
                <tr key={c.id} className="border-t border-line">
                  <td className="p-3"><Link href={`/admin/clientes/${c.id}`}>{c.full_name || c.email}</Link><span className="block text-xs text-muted">{c.email}</span></td>
                  <td className="p-3">{c.phone ?? '—'}</td>
                  <td className="p-3">{fmtDate(c.created_at)}</td>
                  <td className="p-3 text-right">{s ? `${s.n} · ${formatEur(s.total)}` : '0'}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={4} className="p-6 text-muted">No hay clientes.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
