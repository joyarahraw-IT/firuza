'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { addToBag } from '@/lib/bag';
import { estimate, formatRange, type ShipTimes } from '@/lib/delivery';
import { formatEur } from '@/lib/format';
import { MEASURE_MAX, MEASURE_MIN } from '@/lib/guides';

export type PurchaseProduct = {
  slug: string;
  name: string;
  imageKey: string;
  mode: 'made_to_order' | 'shipped';
  making: [number, number] | null;
  shipping: [number, number] | null;
  colors: { name: string; hex: string }[];
  optionGroups: { name: string; required: boolean; values: string[]; quote_values?: string[] }[];
  variants: { id: string; options: Record<string, string>; price_cents: number }[];
};

const same = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

export type QuoteConfig = { sizes: string[]; maxM2: number; note: string };

export function ProductPurchase({ product, ship, whatsapp, notes, quote, customFit = false, bagHref = '/bolsa' }: { product: PurchaseProduct; ship: ShipTimes; whatsapp: string; notes?: { silk?: string; shipping?: string }; quote?: QuoteConfig; /** clothing: offer "A medida" next to the standard sizes */ customFit?: boolean; bagHref?: string }) {
  const [sel, setSel] = useState<Record<string, string>>(() => Object.fromEntries(product.optionGroups.map((g) => [g.name, g.values[0]])));
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState(false); // "A medida": priced like the middle size, measurements saved on the order line
  const [m, setM] = useState({ bust: '', waist: '', hip: '' });
  const [touched, setTouched] = useState(false);
  const [quoteSize, setQuoteSize] = useState(quote?.sizes[0] ?? '');
  const [added, setAdded] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []); // dates are computed in the browser so they are never stale

  // option values flagged quote_values (industrial rugs) are not bought online: they get a WhatsApp quote instead
  const quoteGroup = product.optionGroups.find((g) => g.quote_values?.some((v) => v === sel[g.name]));
  const isQuote = !!quoteGroup && !!quote;
  const sizeGroup = product.optionGroups.find((g) => g.name === 'Talla');
  const canCustom = customFit && !!sizeGroup;
  const useCustom = canCustom && custom;
  const baseSize = sizeGroup ? (sizeGroup.values.includes('M') ? 'M' : sizeGroup.values[Math.floor(sizeGroup.values.length / 2)]) : '';
  const effSel = useCustom && sizeGroup ? { ...sel, Talla: baseSize } : sel;
  const variant = useMemo(() => product.variants.find((v) => same(v.options, effSel)), [product.variants, effSel]);
  const num = (v: string) => (/^d{2,3}$/.test(v.trim()) ? Number(v) : NaN);
  const meas = { bust_cm: num(m.bust), waist_cm: num(m.waist), hip_cm: num(m.hip) };
  const measOk = Object.values(meas).every((n) => n >= MEASURE_MIN && n <= MEASURE_MAX);
  const measText = measOk ? `A medida: busto ${meas.bust_cm} · cintura ${meas.waist_cm} · cadera ${meas.hip_cm} cm` : '';
  const info = { mode: product.mode, making: product.making, shipping: product.shipping };
  const es = today ? estimate(info, ship, 'es', today) : null;
  const eu = today ? estimate(info, ship, 'eu', today) : null;
  const rug = product.mode === 'shipped';

  const optionText = Object.entries(useCustom ? { ...sel, Talla: measText || 'A medida' } : sel).map(([k, v]) => `${k}: ${v}`).join(', ');
  const wa = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, me interesa «${product.name}»${optionText ? ` (${optionText})` : ''}. ¿Me puedes dar más información?`)}`;
  const quoteWa = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, quiero un presupuesto para «${product.name}» en versión ${sel[quoteGroup?.name ?? ''] ?? ''}. Medida: ${quoteSize}.`)}`;

  const add = () => {
    if (!variant) return;
    if (useCustom && !measOk) { setTouched(true); return; }
    addToBag({
      variantId: variant.id, slug: product.slug, name: product.name, options: useCustom ? { ...sel, Talla: measText } : sel, priceCents: variant.price_cents, qty,
      ...(useCustom ? { measurements: meas } : {}),
      imageKey: product.imageKey, mode: product.mode, making: product.making, shipping: product.shipping,
    });
    setAdded(true);
  };

  return (
    <div>
      <p className="label text-[22px] tracking-[0.08em] text-ink" aria-live="polite">
        {isQuote ? 'Precio a consultar' : variant ? formatEur(variant.price_cents) : 'Combinación no disponible'}
      </p>
      {notes?.silk && !isQuote && <p className="mt-2 max-w-[52ch] rounded-lg bg-surface p-3 text-[15px]">{notes.silk}</p>}

      {product.optionGroups.filter((g) => !isQuote || g.name === quoteGroup?.name).map((g) => (
        <fieldset key={g.name} className="mt-6 min-w-0 border-0 p-0">
          <legend className="label mb-2.5 p-0 text-[12px] text-muted">{g.name}</legend>
          <div className="flex flex-wrap gap-2.5">
            {g.values.map((v) => (
              <label key={v} className="cursor-pointer">
                <input
                  type="radio" name={g.name} value={v} checked={sel[g.name] === v && !(canCustom && custom && g.name === 'Talla')}
                  onChange={() => { setSel((s) => ({ ...s, [g.name]: v })); setAdded(false); if (g.name === 'Talla') setCustom(false); }}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-11 items-center rounded-full border border-ink-muted bg-ground px-4 text-[15px] peer-checked:border-firuza-ink peer-checked:bg-firuza-ink peer-checked:font-semibold peer-checked:text-on-firuza-ink peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-turq">
                  {v}
                </span>
              </label>
            ))}
            {canCustom && g.name === 'Talla' && (
              <label className="cursor-pointer">
                <input type="radio" name="Talla" value="A medida" checked={custom} onChange={() => { setCustom(true); setAdded(false); }} className="peer sr-only" />
                <span className="inline-flex min-h-11 items-center rounded-full border border-ink-muted bg-ground px-4 text-[15px] peer-checked:border-firuza-ink peer-checked:bg-firuza-ink peer-checked:font-semibold peer-checked:text-on-firuza-ink peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-firuza-ink">A medida</span>
              </label>
            )}
          </div>
          {canCustom && g.name === 'Talla' && custom && (
            <div className="mt-4 rounded-lg bg-surface p-4">
              <p className="text-[15px]">Escribe tus medidas en centímetros ({MEASURE_MIN}–{MEASURE_MAX}). Mismo precio que la talla {baseSize}.</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {([['bust', 'Busto'], ['waist', 'Cintura'], ['hip', 'Cadera']] as const).map(([k, label]) => {
                  const bad = touched && !(num(m[k]) >= MEASURE_MIN && num(m[k]) <= MEASURE_MAX);
                  return (
                    <label key={k} className="block text-sm font-medium">{label} (cm)
                      <input inputMode="numeric" value={m[k]} onChange={(e) => { setM((x) => ({ ...x, [k]: e.target.value.replace(/D/g, '').slice(0, 3) })); setAdded(false); }} onBlur={() => setTouched(true)} aria-invalid={bad} aria-describedby="meas-help" className="data mt-1.5 block min-h-11 w-full rounded-sm border border-ink-muted bg-ground px-3 text-base aria-[invalid=true]:border-madder" />
                    </label>
                  );
                })}
              </div>
              <p id="meas-help" role="status" className={`mt-2 text-sm ${touched && !measOk ? 'text-madder' : 'text-ink-muted'}`}>{touched && !measOk ? `Cada medida debe estar entre ${MEASURE_MIN} y ${MEASURE_MAX} cm.` : 'Mide busto, cintura y cadera como indica la guía de tallas.'}</p>
            </div>
          )}
        </fieldset>
      ))}

      {product.colors.length > 0 && !product.optionGroups.some((g) => g.name === 'Color') && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <span className="flex gap-1.5" aria-hidden="true">
            {product.colors.map((c) => <i key={c.name} className="h-4 w-4 rounded-full border border-black/20" style={{ background: c.hex }} />)}
          </span>
          {product.colors.map((c) => c.name).join(' · ')}
        </p>
      )}

      {isQuote && quote && (
        <fieldset className="mt-6 min-w-0 border-0 p-0">
          <legend className="label mb-2.5 p-0 text-[12px] text-muted">Medida</legend>
          <div className="flex flex-wrap gap-2.5">
            {quote.sizes.map((s) => (
              <label key={s} className="cursor-pointer">
                <input type="radio" name="quote-size" value={s} checked={quoteSize === s} onChange={() => setQuoteSize(s)} className="peer sr-only" />
                <span className="inline-flex min-h-11 items-center rounded-full border border-ink-muted bg-ground px-4 text-[15px] peer-checked:border-firuza-ink peer-checked:bg-firuza-ink peer-checked:font-semibold peer-checked:text-on-firuza-ink peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-turq">{s}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-[15px] text-muted">{quote.note}</p>
        </fieldset>
      )}

      {!isQuote && <div className="mt-6 flex items-center gap-3">
        <label className="label text-[12px] text-muted" htmlFor="qty">Cantidad</label>
        <div className="flex items-center rounded-lg border border-line bg-surface">
          <button type="button" className="h-11 w-11 text-xl" aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <input id="qty" inputMode="numeric" value={qty} readOnly aria-live="polite" className="h-11 w-10 border-x border-line bg-transparent text-center" />
          <button type="button" className="h-11 w-11 text-xl" aria-label="Más" onClick={() => setQty((q) => Math.min(10, q + 1))}>+</button>
        </div>
      </div>}

      <div className={`mt-6 rounded-lg bg-surface p-4`}>
        <p className="font-semibold">{rug ? 'Ya está tejida: no se hace bajo pedido' : 'Se hace después de tu pedido'}</p>
        <p className="mt-1 text-[15px] text-muted">
          {rug
            ? `Solo tienes que esperar a que llegue: ${product.shipping?.[0]}–${product.shipping?.[1]} días.`
            : `Elaboración ${product.making?.[0]}–${product.making?.[1]} días, más envío (${ship.es_min}–${ship.es_max} días laborables en España peninsular, ${ship.eu_min}–${ship.eu_max} en el resto de la UE).`}
        </p>
        {notes?.shipping && <p className="mt-2 text-[15px]"><strong>Envío:</strong> {notes.shipping}</p>}
        {es && eu && (
          <p className="mt-2 text-[15px]">
            <strong>Llega {formatRange(es.from, es.to)}</strong>{rug ? '' : ' (España peninsular)'}
            {!rug && <span className="block text-muted">Resto de la UE: {formatRange(eu.from, eu.to)}</span>}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {isQuote ? (
          <a href={quoteWa} className="btn btn-primary flex-1">Pedir presupuesto por WhatsApp</a>
        ) : (
          <>
            <button type="button" onClick={add} disabled={!variant} className="btn btn-primary flex-1 whitespace-nowrap disabled:opacity-50">Añadir al pedido</button>
            <a href={wa} aria-label="Preguntar por WhatsApp" className="btn btn-dark flex-1 whitespace-nowrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6z" /></svg>Preguntar</a>
          </>
        )}
      </div>
      <p className="mt-3 min-h-6 text-[15px]" role="status">
        {added && <>Añadido a tu pedido. <Link href={bagHref}>Ver mi pedido →</Link></>}
      </p>
    </div>
  );
}
