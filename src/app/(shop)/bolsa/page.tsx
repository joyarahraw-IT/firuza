import type { Metadata } from 'next';
import { BagView } from '@/components/BagView';
import { getSettings } from '@/lib/catalog';

// Data comes from the database: refresh the static page at most once a minute
export const revalidate = 60;

export const metadata: Metadata = { title: 'Tu pedido', robots: { index: false } };

export default async function BagPage() {
  const settings = await getSettings();
  const s = settings.shipping;
  return (
    <div className="mx-auto min-h-[70vh] max-w-[1200px] px-4 md:px-10 py-12">
      <h1 className="mb-8 text-[clamp(32px,4.6vw,48px)]">Tu pedido</h1>
      <BagView ship={{ es_min: s.es_min, es_max: s.es_max, eu_min: s.eu_min, eu_max: s.eu_max }} rates={settings.shipping_rates} />
    </div>
  );
}
