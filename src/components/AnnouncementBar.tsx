import { getSettings } from '@/lib/catalog';

export async function AnnouncementBar() {
  const text = (await getSettings()).announcement;
  return (
    <div className="bg-ink text-ground" role="region" aria-label="Aviso">
      <p className="px-4 py-2.5 text-center text-[13px] font-medium">{text}</p>
    </div>
  );
}
