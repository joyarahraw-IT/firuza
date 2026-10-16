import Image from 'next/image';
import { addCategory, deleteCategory, moveCategory, removeOwnerPhoto, renameCategory, saveGeneral, saveLegal, savePayment, saveRugs, saveShipping, uploadOwnerPhoto } from './actions';
import { btn, btn2, btnDanger, Card, field, labelCls, Notice, PageHead } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { imageUrl } from '@/lib/images';
import { DEFAULT_RATES } from '@/lib/shipping';

type V = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const eur = (c: number) => (c / 100).toFixed(2).replace('.', ',');

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const [{ data: rows }, { data: cats }, { data: counts }] = await Promise.all([
    db.from('settings').select('key, value'),
    db.from('categories').select('id, name, blurb, slug').order('sort_order'),
    db.from('products').select('category_id'),
  ]);
  const S: Record<string, any> = // eslint-disable-line @typescript-eslint/no-explicit-any
     Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));
  const contact = S.contact ?? {};
  const ship = S.shipping ?? {};
  const rates = { ...DEFAULT_RATES, ...(S.shipping_rates ?? {}) };
  const ind = S.rug_industrial ?? {};
  const rugShip = S.rug_shipping ?? {};
  const legal = S.legal_owner ?? {};
  const texts = S.legal_texts ?? {};
  const perCat = new Map<string, number>();
  for (const p of counts ?? []) if (p.category_id) perCat.set(p.category_id, (perCat.get(p.category_id) ?? 0) + 1);

  return (
    <>
      <PageHead title="Ajustes" />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.err && <Notice kind="error">{sp.err}</Notice>}
      <div className="space-y-8">
        <Card title="General"><div id="general" />
          <form action={saveGeneral} className="grid gap-5 md:grid-cols-2">
            <label className={labelCls}>Nombre de la marca<input name="brand" defaultValue={S.brand ?? 'Firuza'} className={field} /></label>
            <label className={labelCls}>Prefijo de los pedidos (2–4 letras)<input name="order_prefix" defaultValue={S.order_prefix ?? 'FZ'} maxLength={4} className={field} /></label>
            <label className={`${labelCls} md:col-span-2`}>Texto de la barra de anuncio<input name="announcement" defaultValue={S.announcement ?? ''} className={field} /></label>
            <label className={labelCls}>Email de contacto<input name="email" type="email" defaultValue={contact.email ?? ''} className={field} /></label>
            <label className={labelCls}>WhatsApp (con prefijo, sin +)<input name="whatsapp" defaultValue={contact.whatsapp ?? ''} className={field} /></label>
            <label className={labelCls}>Instagram (opcional)<input name="instagram" defaultValue={contact.instagram ?? ''} placeholder="@firuza" className={field} /></label>
            <div className="md:col-span-2"><button className={btn}>Guardar</button></div>
          </form>
        </Card>

        <Card title="Foto de Hafefa (página «Sobre mí»)"><div id="sobre-mi" />
          <div className="flex flex-wrap items-start gap-6">
            <div className="relative aspect-[4/5] w-40 shrink-0 bg-paper">
              {S.owner_photo?.key ? <Image src={imageUrl(S.owner_photo.key, true)} alt="Foto actual" fill sizes="160px" className="object-cover" /> : <p className="grid h-full place-items-center p-3 text-center text-xs text-muted">Sin foto: se muestra el dibujo de kilim</p>}
            </div>
            <div className="min-w-64 flex-1 space-y-4">
              <form action={uploadOwnerPhoto} className="space-y-3">
                <label className={labelCls}>Subir foto (opcional, JPG/PNG/WebP, máx. 12 MB)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required className="mt-1.5 block text-sm" /></label>
                <label className={labelCls}>Descripción de la foto (para accesibilidad)<input name="alt" defaultValue={S.owner_photo?.alt ?? ''} placeholder="Nombre Apellido, en su taller" className={field} /></label>
                <button className={btn}>Subir foto</button>
              </form>
              {S.owner_photo?.key && <form action={removeOwnerPhoto}><button className={btnDanger}>Quitar la foto</button></form>}
              <p className="text-xs text-muted">Se recomienda una foto vertical (4:5). Se reduce automáticamente y no se retoca.</p>
            </div>
          </div>
        </Card>

        <Card title="Envíos"><div id="envios" />
          <form action={saveShipping} className="grid gap-5 md:grid-cols-2">
            <fieldset className="border border-line p-3"><legend className="px-1 text-sm font-medium">Precio del envío por pedido (€)</legend>
              <label className={labelCls}>Comunidad de Madrid (0 = gratis)<input name="madrid" defaultValue={eur(rates.madrid_cents)} inputMode="decimal" className={field} /></label>
              <label className={`${labelCls} mt-3`}>Resto de España peninsular<input name="spain" defaultValue={eur(rates.spain_cents)} inputMode="decimal" className={field} /></label>
              <label className={`${labelCls} mt-3`}>Resto de la UE<input name="eu" defaultValue={eur(rates.eu_cents)} inputMode="decimal" className={field} /></label>
            </fieldset>
            <fieldset className="border border-line p-3"><legend className="px-1 text-sm font-medium">Tiempo de envío (días laborables)</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelCls}>España: mín.<input name="es_min" type="number" min={1} max={30} defaultValue={ship.es_min ?? 2} className={field} /></label>
                <label className={labelCls}>España: máx.<input name="es_max" type="number" min={1} max={30} defaultValue={ship.es_max ?? 4} className={field} /></label>
                <label className={labelCls}>Resto UE: mín.<input name="eu_min" type="number" min={1} max={45} defaultValue={ship.eu_min ?? 4} className={field} /></label>
                <label className={labelCls}>Resto UE: máx.<input name="eu_max" type="number" min={1} max={45} defaultValue={ship.eu_max ?? 7} className={field} /></label>
              </div>
            </fieldset>
            <label className={labelCls}>Texto «destino a consultar» (Baleares, Canarias, Ceuta y Melilla)<input name="consult_label" defaultValue={rates.consult_label} className={field} /></label>
            <label className={labelCls}>Texto de envío de alfombras y kilims<input name="rug_label" defaultValue={rates.rug_label} className={field} /></label>
            <label className={`${labelCls} md:col-span-2`}>Texto general sobre los envíos (aparece en la página de envíos)<textarea name="text" rows={3} defaultValue={ship.text ?? ''} className={`${field} py-2`} /></label>
            <p className="text-sm text-muted md:col-span-2">Se cobra un solo envío por pedido y solo si lleva alguna pieza que no sea alfombra o kilim. Las alfombras y kilims y los destinos «a consultar» no se cobran automáticamente: los confirmas con el cliente.</p>
            <div className="md:col-span-2"><button className={btn}>Guardar envíos</button></div>
          </form>
        </Card>

        <Card title="Pagos"><div id="pagos" />
          <form action={savePayment} className="grid gap-5 md:grid-cols-2">
            <label className={labelCls}>Métodos de pago (uno por línea)<textarea name="methods" rows={4} defaultValue={(S.payment?.methods ?? []).join('\n')} className={`${field} py-2`} /></label>
            <label className={labelCls}>Texto que ve el cliente<textarea name="text" rows={4} defaultValue={S.payment?.text ?? ''} className={`${field} py-2`} /></label>
            <div className="md:col-span-2"><button className={btn}>Guardar pagos</button></div>
          </form>
        </Card>

        <Card title="Alfombras y kilims"><div id="alfombras" />
          <form action={saveRugs} className="grid gap-5 md:grid-cols-2">
            <label className={`${labelCls} md:col-span-2`}>Aviso de medidas y precios (alfombra de seda)<input name="silk_note" defaultValue={S.rug_texts?.silk_note ?? ''} className={field} /></label>
            <label className={labelCls}>Medidas de la alfombra industrial (una por línea)<textarea name="sizes" rows={6} defaultValue={(ind.sizes ?? []).join('\n')} className={`${field} py-2`} /></label>
            <div className="space-y-5">
              <label className={labelCls}>Superficie máxima (m²)<input name="max_m2" defaultValue={ind.max_m2 ?? 24} inputMode="decimal" className={field} /></label>
              <label className={labelCls}>Texto bajo las medidas<textarea name="note" rows={3} defaultValue={ind.note ?? ''} className={`${field} py-2`} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelCls}>Llegada: mín. (días)<input name="rug_min" type="number" min={1} max={90} defaultValue={rugShip.min ?? 15} className={field} /></label>
                <label className={labelCls}>Llegada: máx. (días)<input name="rug_max" type="number" min={1} max={90} defaultValue={rugShip.max ?? 30} className={field} /></label>
              </div>
            </div>
            <p className="text-sm text-muted md:col-span-2">La alfombra industrial se pide por presupuesto (WhatsApp) hasta que se decidan sus precios.</p>
            <div className="md:col-span-2"><button className={btn}>Guardar alfombras</button></div>
          </form>
        </Card>

        <Card title="Datos y textos legales"><div id="legales" />
          <p className="mb-4 max-w-[70ch] text-sm text-muted">Estos textos deben revisarse por un gestor antes de abrir la tienda. El titular es quien vende y cobra (Joya Rahraw); Hafefa es la artesana. Estos datos son privados: el NIE solo aparece en el Aviso legal. Si un campo está vacío, la web muestra «[pendiente]».</p>
          <form action={saveLegal} className="grid gap-5 md:grid-cols-2">
            <label className={labelCls}>Nombre del titular (vendedor/a)<input name="name" defaultValue={legal.name ?? ''} className={field} /></label>
            <label className={labelCls}>NIE<input name="nie" defaultValue={legal.nie ?? ''} className={field} /></label>
            <label className={labelCls}>Email legal<input name="email" defaultValue={legal.email ?? ''} className={field} /></label>
            <label className={labelCls}>Domicilio<input name="address" defaultValue={legal.address ?? ''} className={field} /></label>
            {(['aviso', 'privacidad', 'condiciones', 'envios', 'devoluciones', 'cookies'] as const).map((k) => (
              <label key={k} className={`${labelCls} md:col-span-2`}>Texto: {({ aviso: 'Aviso legal', privacidad: 'Política de privacidad', condiciones: 'Condiciones de venta', envios: 'Envíos', devoluciones: 'Devoluciones', cookies: 'Cookies' })[k]} (vacío = texto por defecto)
                <textarea name={`t_${k}`} rows={4} defaultValue={texts[k] ?? ''} className={`${field} py-2`} /></label>
            ))}
            <div className="md:col-span-2"><button className={btn}>Guardar legales</button></div>
          </form>
        </Card>

        <Card title="Categorías"><div id="categorias" />
          <ul className="m-0 list-none divide-y divide-line p-0">
            {(cats ?? []).map((c, i) => (
              <li key={c.id} className="py-4">
                <form action={renameCategory} className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
                  <input type="hidden" name="id" value={c.id} />
                  <label className={labelCls}>Nombre<input name="name" defaultValue={c.name} className={field} /></label>
                  <label className={labelCls}>Descripción breve<input name="blurb" defaultValue={c.blurb ?? ''} className={field} /></label>
                  <button className={btn2}>Guardar</button>
                </form>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
                  <span>{perCat.get(c.id) ?? 0} productos · /{c.slug}</span>
                  <form action={moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} className="underline disabled:opacity-30">↑ Subir</button></form>
                  <form action={moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" /><button disabled={i === (cats?.length ?? 1) - 1} className="underline disabled:opacity-30">↓ Bajar</button></form>
                  <form action={deleteCategory}><input type="hidden" name="id" value={c.id} /><button className={`${btnDanger} min-h-8 px-3 text-[11px]`}>Eliminar</button></form>
                </div>
              </li>
            ))}
          </ul>
          <form action={addCategory} className="mt-5 grid gap-3 border-t border-line pt-5 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
            <label className={labelCls}>Nueva categoría<input name="name" required className={field} /></label>
            <label className={labelCls}>Descripción breve<input name="blurb" className={field} /></label>
            <button className={btn}>Añadir</button>
          </form>
          <p className="mt-3 text-xs text-muted">Las categorías nuevas aparecen en la página de categoría (/nombre) y al editar un producto. Para añadirlas al menú superior hace falta un pequeño cambio de código.</p>
        </Card>
      </div>
    </>
  );
}
