'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { BagLine } from '@/lib/bag';
import { formatRange } from '@/lib/delivery';
import { formatEur, whatsappLink } from '@/lib/format';
import { DEFAULT_RATES, type ShippingRates } from '@/lib/shipping';
import { optionLabel } from './BagView';
import { LAST_ORDER_KEY } from './CheckoutForm';
import { PayButton, PaymentPoller } from './PayNow';
import { PAY_METHODS } from '@/lib/pay-methods';

export type PayState = 'request' | 'pending' | 'processing' | 'paid' | 'error';

type Saved = {
  number: string; subtotalCents: number; shippingCents: number; shippingToConfirm: boolean; shippingZone: string; totalCents: number;
  from: string; to: string; emailed: boolean; accountPending: boolean; loggedIn: boolean; name: string; email: string; lines: BagLine[];
};

export function OrderConfirmation({ number, rates = DEFAULT_RATES, pay = 'request' }: { number: string; rates?: ShippingRates; pay?: PayState }) {
  const [o, setO] = useState<Saved | null | undefined>(undefined);
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) ?? 'null') as Saved | null;
      setO(s && s.number === number ? s : null);
    } catch {
      setO(null);
    }
  }, [number]);
  if (o === undefined) return null;

  const eta = o ? formatRange(new Date(o.from + 'T12:00:00'), new Date(o.to + 'T12:00:00')) : '';
  const shipText = !o ? '' : o.shippingZone === 'consult' ? 'a consultar' : o.shippingCents > 0 ? formatEur(o.shippingCents) : o.shippingToConfirm && !o.lines.some((l) => l.mode === 'made_to_order') ? 'a confirmar' : 'gratis';
  const text = o
    ? [`Hola, acabo de hacer el pedido ${o.number} en Firuza:`, ...o.lines.map((l) => `- ${l.qty} × ${l.name}${Object.keys(l.options).length ? ` (${optionLabel(l.options)})` : ''} — ${formatEur(l.priceCents * l.qty)}`),
        `Envío: ${shipText}`, `Total: ${formatEur(o.totalCents)}${o.shippingToConfirm ? ' + envío a confirmar' : ''}`, `Llegada estimada: ${eta}`, `Nombre: ${o.name}`, '¿Me confirmas el pedido y cómo pagar?'].join('\n')
    : `Hola, acabo de hacer el pedido ${number} en Firuza. ¿Me lo confirmas?`;

  return (
    <div className="max-w-[760px]">
      <p className="label text-turq">{pay === 'paid' ? 'Pago recibido' : pay === 'request' ? 'Pedido recibido' : 'Pedido guardado'}</p>
      <h1 className="mt-2 text-[clamp(32px,4.6vw,48px)]">¡Gracias{o ? `, ${o.name.split(' ')[0]}` : ''}!</h1>
      <p className="mt-4 text-lg">Tu número de pedido es <strong className="font-mono tracking-wide">{number}</strong>. Guárdalo.</p>
      {pay === 'paid' && <p className="mt-2 rounded-lg bg-turq-tint p-3 text-turq-dark"><strong>Pagado.</strong> Hemos recibido tu pago. ¡Gracias!</p>}
      {pay === 'processing' && <><PaymentPoller /><p role="status" className="mt-2 rounded-lg bg-surface p-3"><strong>Procesando el pago…</strong> Estamos esperando la confirmación del banco; esta página se actualizará sola.</p></>}
      {(pay === 'pending' || pay === 'error') && (
        <div className="mt-2 rounded-lg bg-surface p-3">
          <p><strong>{pay === 'error' ? 'No hemos podido abrir la página de pago.' : 'Tu pedido está guardado, pero aún no se ha pagado.'}</strong> Puedes pagar con {PAY_METHODS} cuando quieras.</p>
          <div className="mt-3"><PayButton number={number} label="Pagar ahora" /></div>
        </div>
      )}
      {pay === 'request' && (
        <p className="mt-2 text-muted">
          Aún no has pagado nada. {o?.emailed ? `Te hemos enviado un email a ${o.email} y ` : ''}Te escribiremos para confirmar el envío y te mandaremos un enlace de pago seguro ({PAY_METHODS}).
        </p>
      )}
      {o?.loggedIn && <p className="mt-2">Puedes seguirlo en <Link href="/cuenta">tu cuenta</Link>.</p>}
      {o?.accountPending && <p className="mt-2 rounded-lg bg-surface p-3">Te hemos enviado un email para confirmar tu cuenta. Al confirmarla, este pedido aparecerá en «Mis pedidos».</p>}

      {o && (
        <div className="mt-8 rounded-lg border border-line bg-surface p-6" aria-label="Resumen del pedido">
          <ul className="m-0 list-none divide-y divide-line p-0">
            {o.lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-4 py-3">
                <span>{l.qty} × {l.name}{Object.keys(l.options).length > 0 && <span className="block text-sm text-muted">{optionLabel(l.options)}</span>}</span>
                <span className="label whitespace-nowrap text-[12.5px]">{formatEur(l.priceCents * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="m-0 space-y-2 border-t border-line pt-4">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="label m-0 text-[13px]">{formatEur(o.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt>Envío</dt><dd className="label m-0 text-[13px]">{shipText.charAt(0).toUpperCase() + shipText.slice(1)}</dd></div>
            {o.shippingToConfirm && <p className="text-sm text-muted">{o.shippingZone === 'consult' ? rates.consult_label : rates.rug_label}</p>}
            <div className="flex justify-between border-t border-line pt-3"><dt><strong>Total</strong></dt><dd className="m-0"><strong className="label text-[15px]">{formatEur(o.totalCents)}</strong>{o.shippingToConfirm && <span className="block text-right text-xs text-muted">+ envío a confirmar</span>}</dd></div>
          </dl>
          <p className="mt-4 rounded-lg bg-turq-tint p-3 text-turq-dark"><strong>Llegada estimada: {eta}</strong></p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3.5">
        {pay === 'request' && <a href={whatsappLink(text)} className="btn btn-dark">Abrir WhatsApp con el resumen</a>}
        <Link href="/" className="btn btn-secondary">Seguir mirando</Link>
      </div>
    </div>
  );
}
