import { guideKeyFor, necklaceType, specRows, specsOf, type Guides } from '@/lib/guides';
import type { Product } from '@/lib/catalog';
import { SizeGuideDialog } from './SizeGuideDialog';

/** "Medidas" block of the product page: this product's specs in mono, plus the size-guide dialog for its category. */
export function ProductMeasures({ product, guides }: { product: Product; guides: Guides }) {
  const key = guideKeyFor(product);
  const specs = specsOf(product);
  const rows = specRows(specs);
  if (key === 'collares' && specs.length_cm) rows.unshift({ label: 'Tipo', value: necklaceType(specs.length_cm) });
  if (!rows.length && !key) return null;
  return (
    <section aria-labelledby="medidas" className="mt-8 rounded-lg bg-surface p-5">
      <h2 id="medidas" className="text-2xl">Medidas</h2>
      {rows.length > 0 && (
        <dl className="data m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[15px]">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="font-sans text-ink-muted">{r.label}</dt>
              <dd className="m-0">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {rows.length > 0 && specs.provisional && <p className="mt-3 text-sm text-ink-muted">Medidas provisionales: Hafefa las confirmará pronto.</p>}
      {key && <div className="mt-4"><SizeGuideDialog guide={guides[key]} /></div>}
    </section>
  );
}
