import Link from 'next/link';
import { COLOR_FAMILIES, colorFamily } from '@/lib/colors';
import { DELIVERY_BUCKETS, PRICE_BUCKETS, SORTS, type Filters } from '@/lib/filters';
import type { Product } from '@/lib/catalog';

const field = 'mt-1.5 block min-h-11 w-full rounded-sm border border-ink-muted bg-ground px-3 text-[15px] text-ink';

/** Plain GET form: works without JavaScript and keeps filters in the URL (shareable, back button friendly). */
export function CatalogFilters({ action, products, filters, extra }: { action: string; products: Product[]; filters: Filters; extra?: Record<string, string> }) {
  const present = new Set(products.flatMap((p) => p.colors.map((c) => colorFamily(c.hex))));
  const colors = COLOR_FAMILIES.filter((c) => present.has(c));
  const active = filters.colors.length > 0 || filters.price !== '' || filters.delivery !== '' || filters.sort !== 'destacados';
  return (
    <form method="get" action={action} className="border-y border-line py-5" aria-label="Filtros y orden">
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="grid gap-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
        {colors.length > 0 && (
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="label mb-2 p-0 text-[11px] text-muted">Color</legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="checkbox" name="color" value={c} defaultChecked={filters.colors.includes(c)} className="peer sr-only" />
                  <span className="inline-flex min-h-11 items-center rounded-full border border-ink-muted bg-ground px-3 text-[13px] peer-checked:border-turq peer-checked:bg-turq-tint peer-checked:text-turq-dark peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-turq">{c}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className="label block text-[11px] text-muted">Precio
          <select name="precio" defaultValue={filters.price} className={field}>
            <option value="">Todos</option>
            {PRICE_BUCKETS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </label>
        <label className="label block text-[11px] text-muted">Plazo
          <select name="plazo" defaultValue={filters.delivery} className={field}>
            <option value="">Todos</option>
            {DELIVERY_BUCKETS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </label>
        <label className="label block text-[11px] text-muted">Ordenar
          <select name="orden" defaultValue={filters.sort} className={field}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-primary min-h-11 px-5">Aplicar</button>
          {active && <Link href={action} className="text-sm">Quitar filtros</Link>}
        </div>
      </div>
    </form>
  );
}
