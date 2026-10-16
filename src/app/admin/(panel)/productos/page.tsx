import Image from 'next/image';
import Link from 'next/link';
import { duplicateProduct, setStatus } from './actions';
import { btn, btn2, field, Notice, PageHead } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { imageUrl } from '@/lib/images';
import { formatEur } from '@/lib/format';

type SP = { q?: string; estado?: string; categoria?: string; aviso?: string; ok?: string; err?: string };
const OK: Record<string, string> = { eliminado: 'Producto eliminado.', publicado: 'Producto publicado.', borrador: 'Producto vuelto a borrador.' };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const [{ data: products }, { data: cats }] = await Promise.all([
    db.from('products')
      .select('id, slug, name, status, featured, needs_real_photo, description, care, base_price_cents, category_id, delivery_mode, product_images(storage_key, is_cover, sort_order), product_variants(price_cents, active)')
      .order('sort_order'),
    db.from('categories').select('id, name').order('sort_order'),
  ]);
  const q = (sp.q ?? '').toLowerCase().trim();
  const rows = (products ?? []).filter((p) => {
    if (q && !`${p.name} ${p.slug}`.toLowerCase().includes(q)) return false;
    if (sp.estado && p.status !== sp.estado) return false;
    if (sp.categoria && p.category_id !== sp.categoria) return false;
    if (sp.aviso === 'confirmar' && !/\[CONFIRMAR/.test(`${p.name} ${p.description} ${p.care ?? ''}`)) return false;
    if (sp.aviso === 'sinfoto' && (p.product_images as unknown[]).length) return false;
    if (sp.aviso === 'ia' && !p.needs_real_photo) return false;
    return true;
  });
  const catName = Object.fromEntries((cats ?? []).map((c) => [c.id, c.name]));

  return (
    <>
      <PageHead title="Productos"><Link href="/admin/productos/nuevo" className={btn}>Nuevo producto</Link></PageHead>
      {sp.ok && OK[sp.ok] && <Notice>{OK[sp.ok]}</Notice>}
      {sp.err && <Notice kind="error">{sp.err}</Notice>}

      <form method="get" className="mb-6 grid gap-3 rounded-lg border border-line bg-surface p-4 md:grid-cols-[1fr_150px_190px_190px_auto] md:items-end" role="search">
        <label className="block text-sm font-medium">Buscar<input name="q" defaultValue={sp.q} className={field} /></label>
        <label className="block text-sm font-medium">Estado
          <select name="estado" defaultValue={sp.estado ?? ''} className={field}><option value="">Todos</option><option value="draft">Borrador</option><option value="published">Publicado</option></select>
        </label>
        <label className="block text-sm font-medium">Categoría
          <select name="categoria" defaultValue={sp.categoria ?? ''} className={field}><option value="">Todas</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </label>
        <label className="block text-sm font-medium">Avisos
          <select name="aviso" defaultValue={sp.aviso ?? ''} className={field}><option value="">Sin filtrar</option><option value="confirmar">Con [CONFIRMAR]</option><option value="sinfoto">Sin fotos</option><option value="ia">Foto de IA</option></select>
        </label>
        <div className="flex gap-2"><button className={btn}>Filtrar</button><Link href="/admin/productos" className={btn2}>Limpiar</Link></div>
      </form>

      <p className="mb-3 text-sm text-muted">{rows.length} de {products?.length ?? 0} productos</p>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[860px] text-left text-[15px]">
          <thead className="bg-paper text-sm text-muted"><tr><th className="p-3 font-medium">Producto</th><th className="p-3 font-medium">Categoría</th><th className="p-3 font-medium">Estado</th><th className="p-3 font-medium">Precio</th><th className="p-3 font-medium">Acciones</th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const imgs = [...(p.product_images as { storage_key: string; is_cover: boolean; sort_order: number }[])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
              const prices = (p.product_variants as { price_cents: number; active: boolean }[]).filter((v) => v.active).map((v) => v.price_cents);
              const lo = Math.min(...prices), hi = Math.max(...prices);
              return (
                <tr key={p.id} className="border-t border-line align-middle">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-16 w-[51px] shrink-0 bg-paper">{imgs[0] && <Image src={imageUrl(imgs[0].storage_key, true)} alt="" fill sizes="51px" className="object-cover" />}</div>
                      <div>
                        <Link href={`/admin/productos/${p.id}`} className="font-medium">{p.name}</Link>
                        <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px]">
                          {p.featured && <span className="rounded-full bg-turq-tint px-2 py-0.5 text-turq-dark">Destacado</span>}
                          {p.needs_real_photo && <span className="rounded-full bg-saffron/20 px-2 py-0.5 text-saffron-text">Foto de IA</span>}
                          {!imgs.length && <span className="rounded-full bg-tile-granada px-2 py-0.5 text-madder">Sin fotos</span>}
                          {/\[CONFIRMAR/.test(`${p.name} ${p.description} ${p.care ?? ''}`) && <span className="rounded-full bg-saffron/20 px-2 py-0.5 text-saffron-text">[CONFIRMAR]</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{p.category_id ? catName[p.category_id] : '—'}</td>
                  <td className="p-3"><span className={`label rounded-full px-3 py-1.5 text-[10.5px] ${p.status === 'published' ? 'bg-tile-turquesa text-ink' : 'bg-paper text-muted'}`}>{p.status === 'published' ? 'Publicado' : 'Borrador'}</span></td>
                  <td className="p-3">{prices.length ? (lo === hi ? formatEur(lo) : `${formatEur(lo)} – ${formatEur(hi)}`) : '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <form action={setStatus}>
                        <input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value="/admin/productos" /><input type="hidden" name="to" value={p.status === 'published' ? 'draft' : 'published'} />
                        <button className="text-sm underline">{p.status === 'published' ? 'Pasar a borrador' : 'Publicar'}</button>
                      </form>
                      <form action={duplicateProduct}><input type="hidden" name="id" value={p.id} /><button className="text-sm underline">Duplicar</button></form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={5} className="p-6 text-muted">Ningún producto coincide.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
