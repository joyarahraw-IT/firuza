import { createProduct } from '../actions';
import { btn, Card, field, labelCls, Notice, PageHead } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { db } = await requireAdmin();
  const { err } = await searchParams;
  const { data: cats } = await db.from('categories').select('id, name').order('sort_order');
  return (
    <>
      <PageHead title="Nuevo producto" back={{ href: '/admin/productos', label: 'Productos' }} />
      {err && <Notice kind="error">{err}</Notice>}
      <Card className="max-w-xl">
        <p className="mb-5 text-muted">Se crea como borrador. En el paso siguiente añades fotos, precios y opciones.</p>
        <form action={createProduct} className="space-y-5">
          <label className={labelCls}>Nombre<input name="name" required minLength={2} className={field} /></label>
          <label className={labelCls}>Categoría
            <select name="category_id" className={field}>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
          <fieldset className="border-0 p-0">
            <legend className="mb-2 text-sm font-medium">¿Cómo se entrega?</legend>
            <label className="mb-2 flex items-start gap-3"><input type="radio" name="delivery_mode" value="made_to_order" defaultChecked className="mt-1.5" /><span>Se hace después del pedido (1–10 días de elaboración + envío)</span></label>
            <label className="flex items-start gap-3"><input type="radio" name="delivery_mode" value="shipped" className="mt-1.5" /><span>Ya está hecha (alfombras y kilims): llega en 15–30 días</span></label>
          </fieldset>
          <button className={btn}>Crear borrador</button>
        </form>
      </Card>
    </>
  );
}
