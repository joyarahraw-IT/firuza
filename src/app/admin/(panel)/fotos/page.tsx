import { PageHead } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';

const STEPS: [string, string][] = [
  ['Luz de día junto a una ventana', 'Sin flash. Si el sol entra directo, aléjate un poco o cubre la ventana con una cortina fina.'],
  ['Siempre el mismo fondo liso y claro', 'Una cartulina o tela blanca/crema, sin arrugas ni sombras fuertes. Así todas las fotos de la tienda se ven iguales.'],
  ['Móvil en vertical', 'La tienda muestra las fotos en formato 4:5 (vertical). Deja un pequeño margen alrededor de la pieza.'],
  ['La pieza en la mano, siempre a la misma distancia', 'Sujeta la pieza con la palma abierta, a unos 30 cm del móvil. Así se aprecia el tamaño real.'],
  ['Tres fotos por pieza', 'Una de estudio (sobre el fondo liso), una en mano y una puesta (collar al cuello, pulsera en la muñeca, pendientes en la oreja).'],
  ['El cierre y el detalle (joyería)', 'Una foto de cerca del cierre y otra del detalle de las cuentas o la piedra.'],
  ['No retoques ni pongas filtros', 'La tienda reduce y convierte las fotos, pero no las retoca. El color debe ser el real.'],
];

export default async function PhotoGuide() {
  await requireAdmin();
  return (
    <>
      <PageHead title="Cómo hacer las fotos" />
      <p className="mb-6 max-w-[70ch] text-sm text-muted">Fotos reales de cada pieza, hechas con el móvil. Al subirlas desde la ficha del producto, elige el tipo: estudio, en mano o puesta. La tienda convierte cada foto a WebP, crea la miniatura y borra los datos EXIF y de ubicación.</p>
      <ol className="m-0 max-w-[70ch] list-none space-y-4 p-0">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-lg border border-line bg-surface p-4">
            <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-firuza-ink font-display text-lg font-bold text-on-firuza-ink">{i + 1}</span>
            <div><h2 className="text-lg tracking-normal">{t}</h2><p className="mt-1 text-[15px]">{d}</p></div>
          </li>
        ))}
      </ol>
    </>
  );
}
