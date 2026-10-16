'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { lineKey, removeLine, setQty, useBag } from '@/lib/bag';
import { estimate, formatRange, latest, type ShipTimes } from '@/lib/delivery';
import { formatEur } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import type { ShippingRates } from '@/lib/shipping';
import { ShippingRateList } from './ShippingInfo';
import { PAY_METHODS } from '@/lib/pay-methods';

export const optionLabel = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(' · ');

export function BagView({ ship, rates }: { ship: ShipTimes; rates: ShippingRates }) {
  const { ready, lines } = useBag();
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  if (!ready) return <p className="text-muted">Cargando tu pedido…</p>;
  if (lines.length === 0) {
    return (
      <div className="max-w-[52ch] rounded-lg border border-line bg-paper p-6">
        <p className="font-serif text-2xl">Tu pedido está vacío</p>
        <p className="mt-2 text-muted">Cuando añadas algo, lo verás aquí con su plazo de entrega.</p>
        <Link href="/collares" className="btn btn-primary mt-5">Ver collares</Link>
      </div>
    );
  }
  const total = lines.reduce((n, l) => n + l.priceCents * l.qty, 0);
  const es = today ? latest(lines.map((l) => estimate(l, ship, 'es', today))) : null;
  const eu = today ? latest(lines.map((l) => estimate(l, ship, 'eu', today))) : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      <ul className="m-0 list-none divide-y divide-line border-y border-line p-0">
        {lines.map((l) => (
          <li key={lineKey(l)} className="grid grid-cols-[88px_1fr] gap-4 py-5 sm:grid-cols-[110px_1fr_auto]">
            <Link href={`/producto/${l.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-[14px] bg-photo">
              <Image src={imageUrl(l.imageKey, true)} alt={l.name} fill sizes="110px" className="object-cover" />
            </Link>
            <div>
              <Link href={`/producto/${l.slug}`} className="font-serif text-xl text-ink no-underline">{l.name}</Link>
              {Object.keys(l.options).length > 0 && <p className="mt-1 text-sm text-muted">{optionLabel(l.options)}</p>}
              <p className="mt-1 text-sm text-muted">{l.mode === 'shipped' ? 'Ya tejida · llega en 15–30 días' : `Se hace en ${l.making?.[0]}–${l.making?.[1]} días`}</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center rounded-lg border border-line bg-surface">
                  <button type="button" className="h-10 w-10 text-lg" aria-label={`Menos unidades de ${l.name}`} onClick={() => setQty(lineKey(l), l.qty - 1)}>−</button>
                  <span className="w-8 text-center" aria-live="polite">{l.qty}</span>
                  <button type="button" className="h-10 w-10 text-lg" aria-label={`Más unidades de ${l.name}`} onClick={() => setQty(lineKey(l), l.qty + 1)}>+</button>
                </div>
                <button type="button" className="text-sm underline" onClick={() => removeLine(lineKey(l))}>Quitar</button>
              </div>
            </div>
            <p className="label col-span-2 text-[13px] sm:col-span-1 sm:text-right">{formatEur(l.priceCents * l.qty)}</p>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-lg border border-line bg-surface p-6" aria-label="Resumen del pedido">
        <h2 className="text-2xl">Resumen</h2>
        <p className="mt-4 flex justify-between border-b border-line pb-4"><span>Subtotal</span><strong className="label text-[15px]">{formatEur(total)}</strong></p>
        <div className="mt-4 text-sm">
          <p className="font-semibold">Envío</p>
          <p className="text-muted">Se calcula en el siguiente paso con tu código postal.</p>
          <ShippingRateList rates={rates} showRug={lines.some((l) => l.mode === 'shipped')} />
        </div>
        <p className="mt-4 text-sm text-muted">Pago seguro con {PAY_METHODS} (alfombras y kilims: te enviamos un enlace de pago tras confirmar el envío).</p>
        {es && eu && (
          <div className="mt-4 rounded-lg bg-turq-tint p-3 text-[15px] text-turq-dark">
            <p><strong>Llega {formatRange(es.from, es.to)}</strong> (España peninsular)</p>
            <p className="mt-0.5">Resto de la UE: {formatRange(eu.from, eu.to)}</p>
          </div>
        )}
        <Link href="/pedido" className="btn btn-primary mt-6 w-full">Continuar con el pedido</Link>
      </aside>
    </div>
  );
}
