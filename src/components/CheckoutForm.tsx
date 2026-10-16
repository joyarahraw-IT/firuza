'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { placeOrder } from '@/app/(shop)/pedido/actions';
import { clearBag, useBag, lineKey } from '@/lib/bag';
import { estimate, formatRange, latest, type ShipTimes } from '@/lib/delivery';
import { formatEur } from '@/lib/format';
import { computeShipping, type ShippingRates } from '@/lib/shipping';
import { optionLabel } from './BagView';
import { shippingRow } from './ShippingInfo';
import { PAY_METHODS } from '@/lib/pay-methods';

export const EU_COUNTRIES: [string, string][] = [
  ['ES', 'España'], ['PT', 'Portugal'], ['FR', 'Francia'], ['DE', 'Alemania'], ['IT', 'Italia'], ['NL', 'Países Bajos'], ['BE', 'Bélgica'],
  ['AT', 'Austria'], ['IE', 'Irlanda'], ['LU', 'Luxemburgo'], ['DK', 'Dinamarca'], ['SE', 'Suecia'], ['FI', 'Finlandia'], ['PL', 'Polonia'],
  ['CZ', 'Chequia'], ['SK', 'Eslovaquia'], ['HU', 'Hungría'], ['RO', 'Rumanía'], ['BG', 'Bulgaria'], ['GR', 'Grecia'], ['HR', 'Croacia'],
  ['SI', 'Eslovenia'], ['EE', 'Estonia'], ['LV', 'Letonia'], ['LT', 'Lituania'], ['CY', 'Chipre'], ['MT', 'Malta'],
];
export const LAST_ORDER_KEY = 'hilvana-last-order';

export type CheckoutUser = {
  email: string;
  fullName: string;
  phone: string;
  addresses: { id: string; label: string | null; full_name: string; phone: string | null; line1: string; line2: string | null; postal_code: string; city: string; province: string | null; country: string }[];
};

const input = 'mt-1.5 block min-h-12 w-full rounded-sm border border-ink-muted bg-ground px-3.5 text-base text-ink aria-[invalid=true]:border-madder';
const lbl = 'block text-[15px] font-medium';

export function CheckoutForm({ ship, rates, user }: { ship: ShipTimes; rates: ShippingRates; user: CheckoutUser | null }) {
  const router = useRouter();
  const { ready, lines } = useBag();
  const def = user?.addresses[0];
  const [country, setCountry] = useState(def?.country ?? 'ES');
  const [postal, setPostal] = useState(def?.postal_code ?? '');
  const [mode, setMode] = useState<'guest' | 'account'>('guest');
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, start] = useTransition();
  const [today, setToday] = useState<Date | null>(null);
  const [vals, setVals] = useState({
    name: def?.full_name ?? user?.fullName ?? '', phone: def?.phone ?? user?.phone ?? '', line1: def?.line1 ?? '', line2: def?.line2 ?? '',
    city: def?.city ?? '', province: def?.province ?? '',
  });
  useEffect(() => setToday(new Date()), []);

  if (!ready) return <p className="text-muted">Cargando…</p>;
  if (lines.length === 0) {
    return (
      <div className="max-w-[52ch] rounded-lg border border-line bg-paper p-6">
        <p className="font-serif text-2xl">Tu pedido está vacío</p>
        <Link href="/collares" className="btn btn-primary mt-5">Ver collares</Link>
      </div>
    );
  }
  const subtotal = lines.reduce((n, l) => n + l.priceCents * l.qty, 0);
  const quote = computeShipping(lines, country, postal, rates);
  const row = shippingRow(quote, rates);
  const total = subtotal + quote.cents;
  const region = quote.zone === 'madrid' || quote.zone === 'spain' ? 'es' : 'eu';
  const eta = today ? latest(lines.map((l) => estimate(l, ship, region, today))) : null;
  const etaText = eta ? formatRange(eta.from, eta.to) : '';
  const set = (k: keyof typeof vals) => (e: React.ChangeEvent<HTMLInputElement>) => setVals((v) => ({ ...v, [k]: e.target.value }));
  const pickAddress = (id: string) => {
    const a = user?.addresses.find((x) => x.id === id);
    if (!a) return;
    setVals({ name: a.full_name, phone: a.phone ?? vals.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, province: a.province ?? '' });
    setCountry(a.country);
    setPostal(a.postal_code);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? '');
    setError(null);
    start(async () => {
      const email = user?.email ?? v('email');
      const res = await placeOrder({
        name: v('name'), email, phone: v('phone'), line1: v('line1'), line2: v('line2'), postal_code: v('postal_code'),
        city: v('city'), province: v('province'), country: v('country'), notes: v('notes'), accept: f.get('accept') === 'on', website: v('website'),
        createAccountPassword: !user && mode === 'account' ? v('password') : undefined,
        saveAddress: f.get('saveAddress') === 'on',
        items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty, ...(l.measurements ? { measurements: l.measurements } : {}) })),
      });
      if (!res.ok) {
        setError({ message: res.error, field: res.field });
        document.getElementById('form-error')?.focus();
        return;
      }
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ ...res, from: res.estimatedFrom, to: res.estimatedTo, name: v('name'), email, lines, loggedIn: !!user }));
      } catch { /* the confirmation page falls back to the order number only */ }
      clearBag();
      if (res.checkoutUrl) { window.location.assign(res.checkoutUrl); return; } // Stripe hosted checkout
      router.push(`/pedido/confirmado?n=${encodeURIComponent(res.number)}`);
    });
  };
  const bad = (k: string) => error?.field === k || undefined;

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1.5fr_1fr]" noValidate>
      <div className="space-y-8">
        <div id="form-error" tabIndex={-1} role="alert" aria-live="assertive" className={error ? 'rounded-lg border border-madder bg-ground p-4 text-madder' : 'sr-only'}>
          {error?.message}
        </div>

        {user ? (
          <div className="rounded-lg border border-line bg-paper p-4 text-[15px]">
            Compras como <strong>{user.email}</strong>. El pedido quedará en <Link href="/cuenta">tu cuenta</Link>.
            {user.addresses.length > 0 && (
              <label className={`${lbl} mt-3`}>Usar una dirección guardada
                <select className={input} defaultValue={user.addresses[0].id} onChange={(e) => pickAddress(e.target.value)}>
                  {user.addresses.map((a) => <option key={a.id} value={a.id}>{a.label ? `${a.label} · ` : ''}{a.line1}, {a.city}</option>)}
                </select>
              </label>
            )}
          </div>
        ) : (
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-3 font-serif text-2xl">¿Cómo quieres comprar?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['guest', 'Comprar como invitado', 'Sin crear cuenta.'], ['account', 'Crear cuenta', 'Verás tus pedidos y guardarás tus direcciones.']] as const).map(([id, t, d]) => (
                <label key={id} className="cursor-pointer">
                  <input type="radio" name="mode" value={id} checked={mode === id} onChange={() => setMode(id)} className="peer sr-only" />
                  <span className="block min-h-[76px] rounded-lg border border-line bg-surface p-4 peer-checked:border-turq peer-checked:bg-turq-tint peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-turq">
                    <strong className="block">{t}</strong><span className="text-sm text-muted">{d}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-sm">¿Ya tienes cuenta? <Link href="/cuenta/entrar?next=/pedido">Inicia sesión</Link></p>
          </fieldset>
        )}

        <fieldset className="m-0 min-w-0 space-y-5 border-0 p-0">
          <legend className="mb-4 font-serif text-2xl">Tus datos</legend>
          <label className={lbl}>Nombre y apellidos<input name="name" autoComplete="name" required value={vals.name} onChange={set('name')} className={input} aria-invalid={bad('name')} /></label>
          <div className="grid gap-5 sm:grid-cols-2">
            {user ? (
              <div className={lbl}>Email<p className="mt-1.5 flex min-h-12 items-center rounded-lg border border-line bg-paper px-3.5 text-base">{user.email}</p></div>
            ) : (
              <label className={lbl}>Email<input name="email" type="email" autoComplete="email" required className={input} aria-invalid={bad('email')} /></label>
            )}
            <label className={lbl}>Teléfono (WhatsApp si puedes)<input name="phone" type="tel" autoComplete="tel" required value={vals.phone} onChange={set('phone')} className={input} aria-invalid={bad('phone')} /></label>
          </div>
          {!user && mode === 'account' && (
            <label className={lbl}>Contraseña (mínimo 8 caracteres)
              <input name="password" type="password" autoComplete="new-password" minLength={8} required className={input} aria-invalid={bad('password')} />
            </label>
          )}
        </fieldset>

        <fieldset className="m-0 min-w-0 space-y-5 border-0 p-0">
          <legend className="mb-4 font-serif text-2xl">Dirección de envío</legend>
          <label className={lbl}>País
            <select name="country" value={country} onChange={(e) => setCountry(e.target.value)} className={input} autoComplete="country">
              {EU_COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
          <label className={lbl}>Dirección<input name="line1" autoComplete="address-line1" required value={vals.line1} onChange={set('line1')} className={input} aria-invalid={bad('line1')} /></label>
          <label className={lbl}>Piso, puerta… (opcional)<input name="line2" autoComplete="address-line2" value={vals.line2} onChange={set('line2')} className={input} /></label>
          <div className="grid gap-5 sm:grid-cols-3">
            <label className={lbl}>Código postal<input name="postal_code" autoComplete="postal-code" required value={postal} onChange={(e) => setPostal(e.target.value)} className={input} aria-invalid={bad('postal_code')} /></label>
            <label className={`${lbl} sm:col-span-2`}>Ciudad<input name="city" autoComplete="address-level2" required value={vals.city} onChange={set('city')} className={input} aria-invalid={bad('city')} /></label>
          </div>
          <label className={lbl}>Provincia (opcional)<input name="province" autoComplete="address-level1" value={vals.province} onChange={set('province')} className={input} /></label>
          {(user || mode === 'account') && (
            <label className="flex items-center gap-3 text-[15px]"><input type="checkbox" name="saveAddress" defaultChecked className="h-5 w-5 accent-[var(--firuza-ink)]" /> Guardar esta dirección en mi cuenta</label>
          )}
        </fieldset>

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-4 font-serif text-2xl">Notas</legend>
          <label className={lbl}>¿Algo que debamos saber? (color, talla, regalo…)
            <textarea name="notes" rows={4} maxLength={1000} className={`${input} py-3`} />
          </label>
        </fieldset>

        {/* honeypot: hidden from people, bots fill it in */}
        <div aria-hidden="true" className="absolute -left-[9999px]"><label>Web<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

        <div>
          <label className="flex items-start gap-3 text-[15px]">
            <input type="checkbox" name="accept" required className="mt-1 h-5 w-5 accent-[var(--firuza-ink)]" aria-invalid={bad('accept')} />
            <span>
              He leído y acepto las <Link href="/condiciones" target="_blank">condiciones de venta</Link> y la <Link href="/privacidad" target="_blank">política de privacidad</Link>, y entiendo
              que {lines.some((l) => l.mode === 'made_to_order') ? 'las piezas se hacen después del pedido y ' : ''}la llegada estimada es {etaText || 'la indicada en el resumen'}.
            </span>
          </label>
          <p className="mt-2 pl-8 text-sm text-muted">Las piezas hechas a tu medida o en el color que eliges no tienen derecho de desistimiento (salvo defecto).</p>
        </div>

        <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60 sm:w-auto sm:min-w-64">
          {pending ? 'Un momento…' : (quote.hasRug || quote.zone === 'consult') ? 'Enviar pedido' : 'Continuar al pago seguro'}
        </button>
        <p className="text-sm text-muted">Pago seguro con {PAY_METHODS}. Alfombras y kilims, y envíos a Baleares, Canarias, Ceuta y Melilla: no pagas nada ahora; te escribimos para confirmar el envío y te mandamos un enlace de pago.</p>
      </div>

      <aside className="h-fit rounded-lg border border-line bg-surface p-6" aria-label="Resumen del pedido">
        <h2 className="text-2xl">Tu pedido</h2>
        <ul className="m-0 mt-4 list-none divide-y divide-line p-0">
          {lines.map((l) => (
            <li key={lineKey(l)} className="flex justify-between gap-4 py-3 text-[15px]">
              <span>{l.qty} × {l.name}{Object.keys(l.options).length > 0 && <span className="block text-sm text-muted">{optionLabel(l.options)}</span>}</span>
              <span className="label whitespace-nowrap text-[12.5px]">{formatEur(l.priceCents * l.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="m-0 mt-2 space-y-2 border-t border-line pt-4 text-[15px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="label m-0 text-[13px]">{formatEur(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Envío</dt><dd className="label m-0 text-[13px]">{row.value}</dd></div>
          {row.note && <p className="text-sm text-muted">{row.note}</p>}
          <div className="flex justify-between border-t border-line pt-3 text-base"><dt><strong>Total</strong></dt><dd className="m-0"><strong className="label text-[15px]">{formatEur(total)}</strong>{quote.toConfirm && <span className="block text-right text-xs text-muted">+ envío a confirmar</span>}</dd></div>
        </dl>
        {eta && <p className="mt-4 rounded-lg bg-turq-tint p-3 text-[15px] text-turq-dark"><strong>Llega {etaText}</strong></p>}
        <Link href="/bolsa" className="mt-4 inline-block text-sm">← Modificar el pedido</Link>
      </aside>
    </form>
  );
}
