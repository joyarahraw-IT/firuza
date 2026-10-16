import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  applyAcrylicRule, deleteImage, deleteProduct, duplicateProduct, moveImage, saveImageAlt, saveImageKind, saveMaterials, saveOptions, saveProduct, saveSpecs, saveVariants, setCover, setStatus, uploadImages,
} from '../actions';
import { MaterialsForm } from '@/components/admin/MaterialsForm';
import { KIND_LABEL, photoKinds, type Materials, type PhotoKind } from '@/lib/materials';
import { btn, btn2, btnDanger, Card, field, labelCls, Notice, PageHead } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { MATERIAL_ACRYLIC } from '@/lib/catalog';
import { formatEur } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { SPEC_META, SPEC_KEYS, specsOf, type Specs } from '@/lib/guides';

const OK: Record<string, string> = {
  creado: 'Producto creado como borrador. Completa los datos, las fotos y los precios.', duplicado: 'Copia creada (en borrador).', datos: 'Datos guardados.', medidas: 'Medidas guardadas.', materiales: 'Materiales guardados.',
  opciones: 'Opciones guardadas. Revisa los precios de las combinaciones nuevas.', precios: 'Precios guardados.', fotos: 'Fotos actualizadas.', publicado: 'Producto publicado.',
  borrador: 'Producto vuelto a borrador.', acrilico: 'Precios de acrílico calculados (piedra ÷ 6).', 'sin-acrilico': 'No hay combinaciones de acrílico que calcular.',
};
type Group = { name: string; required: boolean; values: string[]; quote_values?: string[] };
type Variant = { id: string; options: Record<string, string>; price_cents: number; active: boolean; sort_order: number };
type Img = { id: string; storage_key: string; alt: string | null; is_cover: boolean; sort_order: number };

const hid = (id: string) => <input type="hidden" name="id" value={id} />;

export default async function ProductEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const [{ data: p }, { data: cats }] = await Promise.all([
    db.from('products').select('*, product_variants(*), product_images(*)').eq('id', id).maybeSingle(),
    db.from('categories').select('id, name').order('sort_order'),
  ]);
  if (!p) notFound();
  const groups = (p.option_groups ?? []) as Group[];
  const variants = [...(p.product_variants as Variant[])].sort((a, b) => Number(b.active) - Number(a.active) || a.sort_order - b.sort_order);
  const images = [...(p.product_images as Img[])].sort((a, b) => a.sort_order - b.sort_order);
  const colors = (p.colors ?? []) as { name: string; hex: string }[];
  const hasMaterial = groups.some((g) => g.values.includes(MATERIAL_ACRYLIC));
  const pending = `${p.name} ${p.description} ${p.care ?? ''} ${JSON.stringify(groups)}`.match(/\[CONFIRMAR[^\]]*\]/g);
  const label = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Única';

  return (
    <>
      <PageHead title={p.name} back={{ href: '/admin/productos', label: 'Productos' }}>
        <span className={`label rounded-full px-3 py-1.5 text-[10.5px] ${p.status === 'published' ? 'bg-tile-turquesa text-ink' : 'bg-surface text-muted'}`}>{p.status === 'published' ? 'Publicado' : 'Borrador'}</span>
        <form action={setStatus}>{hid(id)}<input type="hidden" name="to" value={p.status === 'published' ? 'draft' : 'published'} /><button className={btn}>{p.status === 'published' ? 'Pasar a borrador' : 'Publicar'}</button></form>
        <a href={`/producto/${p.slug}`} target="_blank" rel="noopener" className={btn2}>Ver en la tienda ↗</a>
      </PageHead>
      {sp.ok && OK[sp.ok] && <Notice>{OK[sp.ok]}</Notice>}
      {sp.err && <Notice kind="error">{sp.err}</Notice>}
      {pending && <Notice kind="error">Quedan textos por confirmar: {[...new Set(pending)].join(', ')}. No se puede publicar hasta resolverlos.</Notice>}

      <div className="space-y-8">
        {/* ------------------------------------------------ photos */}
        <Card title="Fotos">
          {p.needs_real_photo && <p className="mb-4 rounded-lg bg-surface p-3 text-sm">Las fotos actuales son imágenes de IA: sustitúyelas por fotos reales (sube las nuevas, pon una como portada y elimina las antiguas).</p>}
          <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((im, k) => (
              <li key={im.id} className="border border-line p-2">
                <div className="relative aspect-[4/5] bg-paper"><Image src={imageUrl(im.storage_key, true)} alt={im.alt ?? ''} fill sizes="200px" className="object-cover" />
                  {im.is_cover && <span className="label absolute left-1.5 top-1.5 bg-cotton px-2 py-1 text-[10px]">Portada</span>}</div>
                <form action={saveImageKind} className="mt-2 flex gap-1.5">{hid(id)}<input type="hidden" name="image" value={im.id} />
                  <select name="kind" defaultValue={(im as { kind?: PhotoKind }).kind ?? 'studio'} aria-label="Tipo de foto" className="min-h-9 min-w-0 flex-1 border border-line bg-ground px-2 text-sm">{photoKinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
                  <button className="border border-line px-2 text-xs" title="Guardar tipo">OK</button></form>
                <form action={saveImageAlt} className="mt-2 flex gap-1.5">{hid(id)}<input type="hidden" name="image" value={im.id} />
                  <input name="alt" defaultValue={im.alt ?? ''} aria-label="Texto alternativo de la foto" placeholder="Describe la foto" maxLength={200} className="min-h-9 min-w-0 flex-1 border border-line px-2 text-sm" />
                  <button className="border border-line px-2 text-xs" title="Guardar descripción">OK</button></form>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <form action={moveImage}>{hid(id)}<input type="hidden" name="image" value={im.id} /><input type="hidden" name="dir" value="up" /><button disabled={k === 0} className="underline disabled:opacity-30" aria-label="Mover antes">← Mover</button></form>
                  <form action={moveImage}>{hid(id)}<input type="hidden" name="image" value={im.id} /><input type="hidden" name="dir" value="down" /><button disabled={k === images.length - 1} className="underline disabled:opacity-30" aria-label="Mover después">Mover →</button></form>
                  {!im.is_cover && <form action={setCover}>{hid(id)}<input type="hidden" name="image" value={im.id} /><button className="underline">Hacer portada</button></form>}
                  <form action={deleteImage}>{hid(id)}<input type="hidden" name="image" value={im.id} /><button className="text-madder underline">Eliminar</button></form>
                </div>
              </li>
            ))}
            {!images.length && <li className="col-span-full text-muted">Todavía no hay fotos.</li>}
          </ul>
          <form action={uploadImages} className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5">
            {hid(id)}
            <label className={labelCls}>Subir fotos (hasta 10 a la vez, máx. 12 MB cada una)
              <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required className="mt-1.5 block text-sm" />
            </label>
            <label className={labelCls}>Tipo de foto
              <select name="kind" defaultValue="studio" className={field}>{photoKinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
            </label>
            <button className={btn}>Subir</button>
          </form>
          <p className="mt-2 text-xs text-muted">Se reducen automáticamente (lado largo máx. 1600 px, sin ampliar) y se crean WebP, JPG y miniatura. No se retocan.</p>
        </Card>

        {/* ------------------------------------------------ main data */}
        <Card title="Datos">
          <form action={saveProduct} className="grid gap-5 md:grid-cols-2">
            {hid(id)}
            <label className={labelCls}>Nombre<input name="name" defaultValue={p.name} required className={field} /></label>
            <label className={labelCls}>Dirección web (slug)<input name="slug" defaultValue={p.slug} required className={field} /></label>
            <label className={labelCls}>Categoría
              <select name="category_id" defaultValue={p.category_id ?? ''} className={field}><option value="">Sin categoría</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
            <label className={labelCls}>Entrega
              <select name="delivery_mode" defaultValue={p.delivery_mode} className={field}><option value="made_to_order">Se hace después del pedido</option><option value="shipped">Ya está hecha (llega en 15–30 días)</option></select>
            </label>
            <fieldset className="grid grid-cols-2 gap-3 border-0 p-0"><legend className="mb-1.5 text-sm font-medium">Elaboración (días, 1–10)</legend>
              <input name="making_days_min" type="number" min={1} max={10} defaultValue={p.making_days_min ?? ''} aria-label="Elaboración mínimo" className={field} />
              <input name="making_days_max" type="number" min={1} max={10} defaultValue={p.making_days_max ?? ''} aria-label="Elaboración máximo" className={field} /></fieldset>
            <fieldset className="grid grid-cols-2 gap-3 border-0 p-0"><legend className="mb-1.5 text-sm font-medium">Llegada si ya está hecha (días)</legend>
              <input name="shipping_days_min" type="number" min={1} max={60} defaultValue={p.shipping_days_min ?? ''} aria-label="Llegada mínimo" className={field} />
              <input name="shipping_days_max" type="number" min={1} max={60} defaultValue={p.shipping_days_max ?? ''} aria-label="Llegada máximo" className={field} /></fieldset>
            <label className={`${labelCls} md:col-span-2`}>Descripción (2–3 frases)<textarea name="description" rows={4} defaultValue={p.description} className={`${field} py-2`} /></label>
            <label className={labelCls}>Cuidados<textarea name="care" rows={3} defaultValue={p.care ?? ''} className={`${field} py-2`} /></label>
            <label className={labelCls}>Medidas / largo<textarea name="materials_note" rows={3} defaultValue={p.materials_note ?? ''} className={`${field} py-2`} /></label>
            <fieldset className="md:col-span-2 border-0 p-0"><legend className="mb-2 text-sm font-medium">Colores (nombre y tono)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="flex gap-2">
                    <input name={`color_name_${i + 1}`} defaultValue={colors[i]?.name ?? ''} placeholder="Nombre del color" aria-label={`Color ${i + 1}: nombre`} className="min-h-10 min-w-0 flex-1 border border-line px-2 text-[15px]" />
                    <input type="color" name={`color_hex_${i + 1}`} defaultValue={colors[i]?.hex ?? '#cccccc'} aria-label={`Color ${i + 1}: tono`} className="h-10 w-12 rounded-lg border border-line bg-surface p-0.5" />
                  </div>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-6 md:col-span-2">
              <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={p.featured} className="h-5 w-5 accent-[var(--firuza-ink)]" /> Destacado en la portada</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="needs_real_photo" defaultChecked={p.needs_real_photo} className="h-5 w-5 accent-[var(--firuza-ink)]" /> La foto es de IA (hay que sustituirla)</label>
            </div>
            <div className="md:col-span-2"><button className={btn}>Guardar datos</button></div>
          </form>
        </Card>

        {/* ------------------------------------------------ options + prices */}
        <Card title="Materiales">
          <MaterialsForm action={saveMaterials} id={id} materials={(p.materials ?? {}) as Materials} />
        </Card>

        <Card title="Medidas">
          <form action={saveSpecs} className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {hid(id)}
            {SPEC_KEYS.map((k) => (
              <label key={k} className={labelCls}>{SPEC_META[k].label}{SPEC_META[k].unit ? ` (${SPEC_META[k].unit})` : ''}
                <input name={`spec_${k}`} inputMode="decimal" defaultValue={(specsOf({ slug: p.slug, name: p.name, category: '', specs: p.specs as Specs })[k] as number | undefined) ?? ''} className={field} />
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2 md:col-span-4">
              <input type="checkbox" name="spec_provisional" defaultChecked={!!specsOf({ slug: p.slug, name: p.name, category: '', specs: p.specs as Specs }).provisional} className="h-5 w-5 accent-[var(--firuza-ink)]" /> Medidas provisionales (la tienda las muestra como «provisionales»)
            </label>
            <p className="text-sm text-muted sm:col-span-2 md:col-span-4">Deja vacío lo que no aplique. Collares: largo y peso. Pulseras: largo. Pendientes: caída y peso. Bolsos: ancho, alto, fondo y caída del asa.</p>
            <div className="sm:col-span-2 md:col-span-4"><button className={btn}>Guardar medidas</button></div>
          </form>
        </Card>

        <Card title="Opciones y precios">
          <p className="mb-5 max-w-[70ch] text-sm text-muted">Define las opciones (por ejemplo Material, Modelo, Talla), un valor por línea. Al guardar se crean las combinaciones que falten; las que quites se desactivan (los pedidos antiguos las conservan). Los valores de «solo presupuesto» no se pueden comprar en la web (se piden por WhatsApp).</p>
          <form action={saveOptions} className="grid gap-5 md:grid-cols-2">
            {hid(id)}
            {Array.from({ length: 4 }, (_, i) => {
              const g = groups[i];
              return (
                <fieldset key={i} className="border border-line p-3">
                  <legend className="px-1 text-sm font-medium">Opción {i + 1}</legend>
                  <label className={labelCls}>Nombre<input name={`g_name_${i + 1}`} defaultValue={g?.name ?? ''} placeholder={i === 0 ? 'Material' : ''} className={field} /></label>
                  <label className={`${labelCls} mt-3`}>Valores (uno por línea)<textarea name={`g_values_${i + 1}`} rows={4} defaultValue={g?.values.join('\n') ?? ''} className={`${field} py-2`} /></label>
                  <label className={`${labelCls} mt-3`}>Solo presupuesto (opcional, uno por línea)<textarea name={`g_quote_${i + 1}`} rows={2} defaultValue={g?.quote_values?.join('\n') ?? ''} className={`${field} py-2`} /></label>
                </fieldset>
              );
            })}
            <div className="md:col-span-2"><button className={btn}>Guardar opciones y crear combinaciones</button></div>
          </form>

          <h3 className="mb-3 mt-8 text-lg">Precios por combinación</h3>
          <form action={saveVariants}>
            {hid(id)}
            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[520px] text-left text-[15px]">
                <thead className="bg-paper text-sm text-muted"><tr><th className="p-2.5 font-medium">Combinación</th><th className="w-40 p-2.5 font-medium">Precio (€)</th><th className="w-24 p-2.5 font-medium">Activa</th></tr></thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className={`border-t border-line ${v.active ? '' : 'opacity-50'}`}>
                      <td className="p-2.5">{label(v.options)}<input type="hidden" name="vid" value={v.id} /></td>
                      <td className="p-2.5"><input name={`price_${v.id}`} defaultValue={(v.price_cents / 100).toFixed(2).replace('.', ',')} inputMode="decimal" aria-label={`Precio de ${label(v.options)}`} className="min-h-10 w-full border border-line px-2" /></td>
                      <td className="p-2.5"><input type="checkbox" name={`active_${v.id}`} defaultChecked={v.active} aria-label="Activa" className="h-5 w-5 accent-[var(--firuza-ink)]" /></td>
                    </tr>
                  ))}
                  {!variants.length && <tr><td colSpan={3} className="p-4 text-muted">Guarda las opciones para crear las combinaciones (si no hay opciones, deja todo vacío y guarda: se crea una combinación única).</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">Precio mínimo actual: {variants.some((v) => v.active) ? formatEur(Math.min(...variants.filter((v) => v.active).map((v) => v.price_cents))) : '—'}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className={btn}>Guardar precios</button>
            </div>
          </form>
          {hasMaterial && (
            <form action={applyAcrylicRule} className="mt-4 border-t border-line pt-4">
              {hid(id)}
              <button className={btn2}>Calcular acrílico = piedra ÷ 6</button>
              <span className="ml-3 text-sm text-muted">Redondeado a x,90 y mínimo 5,90. Sobrescribe los precios de «Cuentas acrílicas».</span>
            </form>
          )}
        </Card>

        {/* ------------------------------------------------ danger zone */}
        <Card title="Más acciones">
          <div className="flex flex-wrap items-start gap-6">
            <form action={duplicateProduct}>{hid(id)}<button className={btn2}>Duplicar producto</button></form>
            <form action={deleteProduct} className="flex flex-wrap items-center gap-3">
              {hid(id)}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="h-5 w-5 accent-[var(--anar-deep)]" /> Sí, quiero eliminarlo definitivamente</label>
              <button className={btnDanger}>Eliminar producto</button>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
