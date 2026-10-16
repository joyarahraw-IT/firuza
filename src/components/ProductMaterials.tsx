import type { Product } from '@/lib/catalog';
import { materialRows } from '@/lib/materials';

/** "Materiales" block: only what the owner entered (stones, clasp, thread / fibre composition and care). Hidden while empty. */
export function ProductMaterials({ product }: { product: Product }) {
  const rows = materialRows(product.materials, product.category);
  if (!rows.length) return null;
  return (
    <section aria-labelledby="materiales" className="mt-4 rounded-lg bg-surface p-5">
      <h2 id="materiales" className="text-2xl">Materiales</h2>
      <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-ink-muted">{r.label}</dt>
            <dd className="m-0">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
