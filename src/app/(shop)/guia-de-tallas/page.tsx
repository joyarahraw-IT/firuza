import type { Metadata } from 'next';
import Link from 'next/link';
import { SizeGuideView } from '@/components/SizeGuideView';
import { getSettings } from '@/lib/catalog';
import { GUIDE_ORDER } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Guía de tallas y medidas',
  description: 'Largos de collar, tallas de pulsera, ropa de crochet, zapatillas, bolsos y alfombras: cómo medir y qué talla elegir.',
  alternates: { canonical: '/guia-de-tallas' },
};

export default async function SizeGuidePage() {
  const { size_guides: guides } = await getSettings();
  return (
    <div className="mx-auto max-w-[900px] px-4 py-14 md:px-10">
      <p className="label text-firuza-ink">Guía de tallas</p>
      <h1 className="mt-3 text-[clamp(34px,5vw,52px)]">Medidas y tallas</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-ink-muted">Todas las medidas están en centímetros. Hafefa hace cada pieza a estas medidas. Si dudas, escríbele por WhatsApp.</p>
      <nav aria-label="Categorías de la guía" className="mt-6 flex flex-wrap gap-2">
        {GUIDE_ORDER.map((k) => <a key={k} href={`#${k}`} className="label inline-flex min-h-11 items-center rounded-full border-2 border-ink-muted px-4 text-ink no-underline hover:bg-surface hover:text-ink">{guides[k].title.split(':')[0]}</a>)}
      </nav>
      <div className="mt-12 space-y-16">
        {GUIDE_ORDER.map((k) => (
          <section key={k} id={k} className="scroll-mt-6 border-t border-line pt-10">
            <SizeGuideView guide={guides[k]} headingLevel={2} />
          </section>
        ))}
      </div>
      <p className="mt-14"><Link href="/contacto">¿Necesitas una medida distinta? Escríbenos.</Link></p>
    </div>
  );
}
