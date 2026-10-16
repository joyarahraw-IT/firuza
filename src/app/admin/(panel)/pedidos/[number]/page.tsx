import { notFound } from 'next/navigation';
import { addOrderNote, changeStatus, createPaymentLink, resendPaidEmails, saveOrderFields } from '../actions';
import { btn, btn2, Card, field, labelCls, Notice, PageHead, StatusBadge, waPhone } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { ORDER_STATUSES } from '@/lib/admin-orders';
import { formatEur } from '@/lib/format';
import { fmtDate, fmtDateTime, STATUS_LABEL } from '@/lib/orders';

type Item = { id: string; name: string; options: Record<string, string>; unit_price_cents: number; quantity: number; line_total_cents: number; delivery_mode: string };
const MSG: Record<string, [string, 'ok' | 'error']> = {
  estado: ['Estado actualizado.', 'ok'], datos: ['Datos guardados.', 'ok'], nota: ['Nota añadida.', 'ok'], enlace: ['Enlace de pago creado. Cópialo y envíaselo al cliente (caduca en 24 horas).', 'ok'],
  emails: ['Emails reenviados (cliente y tú).', 'ok'], erroremails: ['No se han podido enviar los emails. Mira el registro del servidor ([email] FAILED).', 'error'],
  errorpago: ['No se ha podido crear el enlace de pago. Revisa las claves de Stripe.', 'error'],
  error: ['No se ha podido guardar. Revisa los datos.', 'error'],
};

export default async function OrderAdmin({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { number } = await params;
  const { ok } = await searchParams;
  const { db } = await requireAdmin();
  const { data: o } = await db.from('orders').select('*, order_items(*)').eq('number', number).maybeSingle();
  if (!o) notFound();
  const [{ data: history }, { data: notes }] = await Promise.all([
    db.from('order_status_history').select('status, note, created_at').eq('order_id', o.id).order('created_at'),
    db.from('order_notes').select('id, body, created_at').eq('order_id', o.id).order('created_at', { ascending: false }),
  ]);
  const a = o.shipping_address as { line1: string; line2?: string; postal_code: string; city: string; province?: string; country: string };
  const items = o.order_items as Item[];
  const summary = items.map((i) => `${i.quantity} × ${i.name}${Object.keys(i.options).length ? ` (${Object.values(i.options).join(', ')})` : ''}`).join('; ');
  const hello = `Hola ${o.contact_name.split(' ')[0]}, soy Hafefa de Firuza. Sobre tu pedido ${o.number} (${summary}): `;
  const wa = `https://wa.me/${waPhone(o.contact_phone)}?text=${encodeURIComponent(hello)}`;
  const mail = `mailto:${o.contact_email}?subject=${encodeURIComponent(`Tu pedido ${o.number} en Firuza`)}&body=${encodeURIComponent(`${hello}\n\nUn saludo,\nHafefa · Firuza`)}`;
  const m = ok ? MSG[ok] : undefined;

  return (
    <>
      <PageHead title={`Pedido ${o.number}`} back={{ href: '/admin/pedidos', label: 'Pedidos' }}>
        <StatusBadge status={o.status} />
        <a href={wa} target="_blank" rel="noopener" className={btn}>WhatsApp</a>
        <a href={mail} className={btn2}>Email</a>
      </PageHead>
      {m && <Notice kind={m[1]}>{m[0]}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Productos">
            <ul className="m-0 list-none divide-y divide-line p-0">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3">
                  <span>{i.quantity} × {i.name}{Object.keys(i.options).length > 0 && <span className="block text-sm text-muted">{Object.entries(i.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span>}
                    <span className="block text-xs text-muted">{formatEur(i.unit_price_cents)} c/u · {i.delivery_mode === 'shipped' ? 'ya tejida' : 'bajo pedido'}</span></span>
                  <span>{formatEur(i.line_total_cents)}</span>
                </li>
              ))}
            </ul>
            <dl className="m-0 ml-auto mt-3 max-w-xs space-y-1.5 text-[15px]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="m-0">{formatEur(o.subtotal_cents)}</dd></div>
              <div className="flex justify-between"><dt>Envío</dt><dd className="m-0">{(o.shipping_zone === 'consult' && o.shipping_to_confirm) ? 'A consultar' : o.shipping_cents > 0 ? formatEur(o.shipping_cents) : o.shipping_to_confirm ? 'A confirmar' : 'Gratis'}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-lg"><dt><strong>Total</strong></dt><dd className="m-0"><strong>{formatEur(o.total_cents)}</strong></dd></div>
            </dl>
            {o.shipping_to_confirm && <p className="mt-3 rounded-lg bg-surface p-3 text-sm">Hay gastos de envío por confirmar con el cliente ({o.shipping_zone === 'consult' ? 'destino a consultar' : 'alfombras/kilims'}).</p>}
          </Card>

          <Card title="Cliente y entrega">
            <p>{o.contact_name}<br />{o.contact_email} · {o.contact_phone}</p>
            <p className="mt-3 text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.postal_code} {a.city}{a.province ? ` (${a.province})` : ''}, {a.country}</p>
            {o.notes && <p className="mt-3 rounded-lg bg-turq-tint p-3"><strong>Nota del cliente:</strong> {o.notes}</p>}
            <p className="mt-3 text-sm text-muted">Hecho el {fmtDateTime(o.placed_at)} · llegada estimada {o.estimated_from ? `${fmtDate(o.estimated_from)} – ${fmtDate(o.estimated_to)}` : '—'} · {o.customer_id ? 'con cuenta' : 'invitado'}</p>
          </Card>

          <Card title="Historial">
            <ol className="m-0 list-none space-y-2.5 p-0">
              {(history ?? []).map((h, i) => (
                <li key={i} className="flex gap-3"><span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-turq" aria-hidden="true" />
                  <span><strong>{STATUS_LABEL[h.status]}</strong> <span className="text-sm text-muted">· {fmtDateTime(h.created_at)}</span>{h.note && <span className="block text-[15px]">{h.note}</span>}</span></li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Cambiar estado">
            <form action={changeStatus} className="space-y-4">
              <input type="hidden" name="number" value={o.number} />
              <label className={labelCls}>Nuevo estado
                <select name="status" defaultValue={o.status} className={field}>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
              </label>
              <label className={labelCls}>Mensaje para el cliente (aparece en su historial, opcional)
                <input name="note" maxLength={300} className={field} placeholder="Ej.: Enviado con SEUR" />
              </label>
              <button className={btn}>Guardar estado</button>
            </form>
          </Card>

          <Card title="Pago online (Stripe)">
            <p className="m-0">{o.payment_status === 'paid' ? <strong className="text-turq">Pagado{o.paid_at ? ` · ${fmtDateTime(o.paid_at)}` : ''}</strong> : <strong>Sin pagar</strong>}</p>
            {(o.stripe_payment_intent_id || o.stripe_session_id) && <p className="mt-2 break-all font-mono text-xs text-muted">{o.stripe_payment_intent_id ?? o.stripe_session_id}</p>}
            {o.payment_status === 'paid' && (
              <form action={resendPaidEmails} className="mt-4">
                <input type="hidden" name="number" value={o.number} />
                <button className={btn}>Reenviar emails de pedido pagado</button>
              </form>
            )}
            {o.payment_status !== 'paid' && o.status !== 'cancelado' && (
              <form action={createPaymentLink} className="mt-4 space-y-3">
                <input type="hidden" name="number" value={o.number} />
                <p className="text-sm text-muted">Para alfombras/kilims o envíos a consultar. Total del enlace = productos + envío confirmado.</p>
                <label className={labelCls}>Gastos de envío confirmados (€)<input name="shipping" inputMode="decimal" required defaultValue={(o.shipping_cents / 100).toFixed(2).replace('.', ',')} className={field} /></label>
                <button className={btn}>Enviar enlace de pago</button>
              </form>
            )}
            {o.payment_status !== 'paid' && o.payment_link_url && (
              <label className={`${labelCls} mt-4`}>Último enlace (cópialo y envíalo al cliente)
                <input readOnly value={o.payment_link_url} className={`${field} font-mono text-xs`} />
              </label>
            )}
          </Card>

          <Card title="Entrega y pago">
            <form action={saveOrderFields} className="space-y-4">
              <input type="hidden" name="number" value={o.number} />
              <label className={labelCls}>Fecha prometida de entrega<input type="date" name="due_date" defaultValue={o.due_date ?? ''} className={field} /></label>
              <label className={labelCls}>Número de seguimiento<input name="tracking_number" defaultValue={o.tracking_number ?? ''} className={field} /></label>
              <label className={labelCls}>Forma de pago acordada<input name="payment_method" defaultValue={o.payment_method ?? ''} placeholder="Bizum, transferencia…" className={field} /></label>
              <button className={btn}>Guardar</button>
            </form>
          </Card>

          <Card title="Notas internas">
            <p className="mb-3 text-sm text-muted">Solo las ves tú. El cliente nunca las ve.</p>
            <form action={addOrderNote} className="space-y-3">
              <input type="hidden" name="number" value={o.number} />
              <textarea name="body" rows={3} required maxLength={2000} className={`${field} py-2`} aria-label="Nueva nota interna" />
              <button className={btn2}>Añadir nota</button>
            </form>
            <ul className="m-0 mt-4 list-none space-y-3 p-0">
              {(notes ?? []).map((n) => <li key={n.id} className="border-t border-line pt-3 text-[15px]">{n.body}<span className="block text-xs text-muted">{fmtDateTime(n.created_at)}</span></li>)}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
