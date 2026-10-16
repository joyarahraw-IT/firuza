import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountNav } from '@/components/AccountNav';
import { requireShopUser } from '@/lib/auth';
import { formatEur } from '@/lib/format';
import { fmtDate, STATUS_LABEL } from '@/lib/orders';
import { shopClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Mis pedidos', robots: { index: false } };

export default async function AccountHome() {
  const user = await requireShopUser('/cuenta');
  const db = await shopClient();
  const { data: orders } = await db
    .from('orders')
    .select('number, status, total_cents, shipping_to_confirm, placed_at, estimated_from, estimated_to, order_items(name, quantity)')
    .order('placed_at', { ascending: false });
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <AccountNav current="/cuenta" name={user.fullName} />
      <h2 className="mb-6 text-3xl">Mis pedidos</h2>
      {!orders?.length ? (
        <div className="max-w-[52ch] rounded-lg border border-line bg-paper p-6">
          <p className="font-serif text-2xl">Todavía no tienes pedidos</p>
          <p className="mt-2 text-muted">Cuando hagas uno, aparecerá aquí con su estado.</p>
          <Link href="/collares" className="btn btn-primary mt-5">Ver colección</Link>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-line border-y border-line p-0">
          {orders.map((o) => (
            <li key={o.number}>
              <Link href={`/cuenta/pedidos/${o.number}`} className="grid gap-1 py-5 text-ink no-underline sm:grid-cols-[1fr_auto] sm:items-center">
                <span>
                  <strong className="font-mono">{o.number}</strong>
                  <span className="ml-3 text-sm text-muted">{fmtDate(o.placed_at)}</span>
                  <span className="mt-1 block text-[15px] text-muted">{(o.order_items as { name: string; quantity: number }[]).map((i) => `${i.quantity} × ${i.name}`).join(', ')}</span>
                </span>
                <span className="flex items-center gap-4 sm:justify-end">
                  <span className="label rounded-full bg-turq-tint px-3 py-2 text-[11px] text-turq-dark">{STATUS_LABEL[o.status] ?? o.status}</span>
                  <span className="label text-[13px]">{formatEur(o.total_cents)}{o.shipping_to_confirm ? '+' : ''}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
