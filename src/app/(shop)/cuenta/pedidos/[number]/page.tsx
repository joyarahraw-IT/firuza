import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountNav } from '@/components/AccountNav';
import { PayButton } from '@/components/PayNow';
import { ReviewForm } from '@/components/ReviewForm';
import { requireShopUser } from '@/lib/auth';
import { formatEur } from '@/lib/format';
import { fmtDate, fmtDateTime, STATUS_HELP, STATUS_LABEL, STATUS_ORDER } from '@/lib/orders';
import { shopClient } from '@/lib/supabase/server';
import { PAY_METHODS } from '@/lib/pay-methods';

export const metadata: Metadata = { title: 'Pedido', robots: { index: false } };

type Item = { id: string; product_id: string | null; name: string; options: Record<string, string>; unit_price_cents: number; quantity: number; line_total_cents: number };

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireShopUser(`/cuenta/pedidos/${number}`);
  const db = await shopClient();
  // row level security: a customer can only ever load their own orders
  const { data: o } = await db.from('orders').select('*, order_items(*)').eq('number', number).maybeSingle();
  if (!o) notFound();
  const { data: history } = await db.from('order_status_history').select('status, note, created_at').eq('order_id', o.id).order('created_at');
  const a = o.shipping_address as { line1: string; line2?: string; postal_code: string; city: string; province?: string; country: string };
  const { data: myReviews } = o.status === 'entregado' ? await db.from('reviews').select('product_id, status').eq('order_id', o.id) : { data: [] };
  const reviewed = new Map((myReviews ?? []).map((r) => [r.product_id, r.status]));
  const reached = new Set((history ?? []).map((h) => h.status));
  const cancelled = o.status === 'cancelado';

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <AccountNav current="/cuenta" name={user.fullName} />
      <p className="mb-2"><Link href="/cuenta">← Mis pedidos</Link></p>
      <h2 className="text-3xl">Pedido <span className="font-mono">{o.number}</span></h2>
      <p className="mt-1 text-muted">Hecho el {fmtDate(o.placed_at)}</p>

      <p className="mt-6 rounded-lg bg-turq-tint p-4 text-turq-dark">
        <strong>{STATUS_LABEL[o.status]}.</strong> {STATUS_HELP[o.status]}
        {o.tracking_number && <span className="mt-1 block">Número de seguimiento: <strong className="font-mono">{o.tracking_number}</strong></span>}
        {o.estimated_from && o.estimated_to && !cancelled && o.status !== 'entregado' && <span className="mt-1 block">Llegada estimada: del {fmtDate(o.estimated_from)} al {fmtDate(o.estimated_to)}.</span>}
      </p>

      {o.status === 'pendiente_pago' && o.payment_status !== 'paid' && <div className="mt-4"><PayButton number={o.number} label={`Pagar ahora con ${PAY_METHODS}`} /></div>}

      <h3 className="mb-4 mt-10 text-2xl">Seguimiento</h3>
      <ol className="m-0 list-none space-y-3 p-0">
        {(history ?? []).map((h, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-turq" aria-hidden="true" />
            <span><strong>{STATUS_LABEL[h.status]}</strong> <span className="text-sm text-muted">· {fmtDateTime(h.created_at)}</span>{h.note && <span className="block text-[15px]">{h.note}</span>}</span>
          </li>
        ))}
        {!cancelled && STATUS_ORDER.filter((s) => !reached.has(s)).map((s) => (
          <li key={s} className="flex gap-3 text-muted">
            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-line" aria-hidden="true" />
            <span>{STATUS_LABEL[s]} <span className="text-sm">(pendiente)</span></span>
          </li>
        ))}
      </ol>

      <h3 className="mb-4 mt-10 text-2xl">Resumen</h3>
      <ul className="m-0 list-none divide-y divide-line border-y border-line p-0">
        {(o.order_items as Item[]).map((i) => (
          <li key={i.id} className="flex justify-between gap-4 py-3">
            <span>{i.quantity} × {i.name}{Object.keys(i.options).length > 0 && <span className="block text-sm text-muted">{Object.entries(i.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span>}</span>
            <span className="label whitespace-nowrap text-[12.5px]">{formatEur(i.line_total_cents)}</span>
          </li>
        ))}
      </ul>
      <dl className="m-0 ml-auto mt-3 max-w-xs space-y-1.5">
        <div className="flex justify-between"><dt>Subtotal</dt><dd className="m-0">{formatEur(o.subtotal_cents)}</dd></div>
        <div className="flex justify-between"><dt>Envío</dt><dd className="m-0">{(o.shipping_zone === 'consult' && o.shipping_to_confirm) ? 'A consultar' : o.shipping_cents > 0 ? formatEur(o.shipping_cents) : o.shipping_to_confirm ? 'A confirmar' : 'Gratis'}</dd></div>
        <div className="flex justify-between border-t border-line pt-2 text-lg"><dt><strong>Total</strong></dt><dd className="m-0"><strong>{formatEur(o.total_cents)}</strong>{o.shipping_to_confirm && <span className="block text-right text-xs text-muted">+ envío a confirmar</span>}</dd></div>
      </dl>

      {o.status === 'entregado' && (
        <>
          <h3 className="mb-4 mt-10 text-2xl">Tu opinión</h3>
          <div className="space-y-3">
            {(o.order_items as Item[]).filter((i) => i.product_id).map((i) => reviewed.has(i.product_id!)
              ? <p key={i.id} className="text-muted">Gracias por tu opinión sobre «{i.name}»{reviewed.get(i.product_id!) === 'pending' ? ' (pendiente de revisión)' : ''}.</p>
              : <ReviewForm key={i.id} orderId={o.id} productId={i.product_id!} productName={i.name} />)}
          </div>
        </>
      )}

      <h3 className="mb-3 mt-10 text-2xl">Entrega</h3>
      <p className="text-muted">{o.contact_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.postal_code} {a.city}{a.province ? ` (${a.province})` : ''}, {a.country}</p>
      {o.notes && <p className="mt-3"><strong>Tu nota:</strong> {o.notes}</p>}
    </div>
  );
}
