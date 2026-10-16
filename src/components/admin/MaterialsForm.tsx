import { btn, field, labelCls } from '@/components/admin/ui';
import { FIBERS, MAX_FIBERS, MAX_STONES, METALS, STONE_TYPES, THREADS, type Materials } from '@/lib/materials';

/** "Materiales" card of the admin product page. Pure form (the action is passed in), so it can be previewed on its own. */
export function MaterialsForm({ action, id, materials }: { action: (f: FormData) => void | Promise<void>; id: string; materials: Materials }) {
  const stones = materials.stones ?? [];
  const fibers = materials.fibers ?? [];
  const typeOf = (name: string) => STONE_TYPES.find((t) => t !== 'Otra' && name.startsWith(t)) ?? (name ? 'Otra' : '');
  const varietyOf = (name: string) => {
    const t = typeOf(name);
    return t && t !== 'Otra' ? name.slice(t.length).trim() : t === 'Otra' ? name : '';
  };
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={id} />
      <fieldset className="border-0 p-0">
        <legend className="mb-1 text-sm font-medium">Piedras (joyería)</legend>
        <p className="mb-3 text-sm text-muted">Elige el tipo, añade el color o variedad si quieres («roja») y marca «natural» solo si lo es. Con «Otra», escribe el nombre en el campo de color/variedad.</p>
        <div className="grid gap-2">
          {Array.from({ length: MAX_STONES }, (_, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1.2fr_1.4fr_auto] sm:items-center">
              <select name={`stone_type_${i + 1}`} defaultValue={typeOf(stones[i]?.name ?? '')} aria-label={`Piedra ${i + 1}: tipo`} className={`${field} !mt-0`}>
                <option value="">—</option>
                {STONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input name={`stone_variety_${i + 1}`} defaultValue={varietyOf(stones[i]?.name ?? '')} placeholder="Color o variedad (roja, azul…)" aria-label={`Piedra ${i + 1}: color o variedad`} maxLength={40} className={`${field} !mt-0`} />
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name={`stone_natural_${i + 1}`} defaultChecked={!!stones[i]?.natural} className="h-5 w-5 accent-[var(--firuza-ink)]" /> Natural</label>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelCls}>Cierre y herrajes (metal)
          <select name="metal" defaultValue={materials.metal ?? ''} className={field}><option value="">—</option>{METALS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
        </label>
        <label className={labelCls}>Montado en
          <select name="thread" defaultValue={materials.thread ?? ''} className={field}><option value="">—</option>{THREADS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
        </label>
      </div>

      <fieldset className="border-0 p-0">
        <legend className="mb-1 text-sm font-medium">Composición de fibras (ropa, bolsos, alfombras)</legend>
        <p className="mb-3 text-sm text-muted">Obligatoria por el Reglamento (UE) 1007/2011. Si rellenas alguna fila, el total debe ser 100 %.</p>
        <div className="grid gap-2">
          {Array.from({ length: MAX_FIBERS }, (_, i) => (
            <div key={i} className="grid grid-cols-[1.4fr_110px] gap-2">
              <select name={`fiber_${i + 1}`} defaultValue={fibers[i]?.fiber ?? ''} aria-label={`Fibra ${i + 1}`} className={`${field} !mt-0`}>
                <option value="">—</option>{FIBERS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <input name={`fiber_pct_${i + 1}`} inputMode="numeric" defaultValue={fibers[i]?.pct ?? ''} placeholder="%" aria-label={`Fibra ${i + 1}: porcentaje`} maxLength={3} className={`${field} !mt-0`} />
            </div>
          ))}
        </div>
      </fieldset>

      <label className={labelCls}>Cuidados (opcional: si lo dejas vacío, se deducen de la fibra principal)
        <textarea name="care" rows={3} defaultValue={materials.care ?? ''} maxLength={600} className={`${field} py-2`} />
      </label>
      <div><button className={btn}>Guardar materiales</button></div>
    </form>
  );
}
