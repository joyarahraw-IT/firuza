import Link from 'next/link';
import { PageHead } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { guideKeyFor, specsOf, type Specs } from '@/lib/guides';
import { isJewellery, type Materials } from '@/lib/materials';

type Row = { id: string; slug: string; name: string; status: string; specs: Specs | null; materials: Materials | null; categories: { slug: string } | null; product_images: { kind?: string }[] };

/** Products whose data sheet is not finished: no real materials, provisional measurements, or no in-hand photo. */
export default async function IncompleteSheets() {
  const { db } = await requireAdmin();
  const { data } = await db.from('products').select('*, categories(slug), product_images(*)').order('sort_order');
  const rows = ((data ?? []) as Row[]).map((p) => {
    const category = p.categories?.slug ?? '';
    const key = guideKeyFor({ slug: p.slug, name: p.name, category });
    const m = p.materials ?? {};
    const needsMeasures = key === 'collares' || key === 'pulseras' || key === 'pendientes' || key === 'bolsos';
    const specs = specsOf({ slug: p.slug, name: p.name, category, specs: p.specs });
    const problems: string[] = [];
    if (isJewellery(category) ? !m.stones?.length : !m.fibers?.length) problems.push(isJewellery(category) ? 'Faltan las piedras (materiales)' : 'Falta la composición de fibras');
    if (needsMeasures && (specs.provisional || !Object.keys(specs).length)) problems.push('Medidas provisionales o sin rellenar');
    if (!p.product_images.some((i) => i.kind === 'in_hand')) problems.push('Falta una foto en mano');
    return { p, problems };
  }).filter((r) => r.problems.length);
  return (
    <>
      <PageHead title="Fichas incompletas" />
      <p className="mb-5 max-w-[70ch] text-sm text-muted">Productos a los que les falta algún dato real. Nada se inventa: la tienda solo muestra lo que rellenas. {rows.length} {rows.length === 1 ? 'producto' : 'productos'} por completar.</p>
      <ul className="m-0 list-none space-y-3 p-0">
        {rows.map(({ p, problems }) => (
          <li key={p.id} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">{p.name} <span className="text-sm font-normal text-muted">· {p.status === 'published' ? 'publicado' : 'borrador'}</span></p>
              <Link href={`/admin/productos/${p.id}`} className="label inline-flex min-h-11 items-center">Editar →</Link>
            </div>
            <ul className="m-0 mt-2 list-disc space-y-1 pl-5 text-sm">{problems.map((x) => <li key={x}>{x}</li>)}</ul>
          </li>
        ))}
        {!rows.length && <li className="text-muted">Todas las fichas están completas.</li>}
      </ul>
    </>
  );
}
