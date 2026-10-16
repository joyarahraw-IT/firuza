import type { Metadata } from 'next';
import Image from 'next/image';
import { KilimPlaceholder } from '@/components/KilimPlaceholder';
import { getSettings } from '@/lib/catalog';
import { whatsappLink } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { owner } from '@/content/owner';

export const metadata: Metadata = {
  title: 'Sobre mí',
  description: 'Soy Nombre Apellido, de Afganistán y afincada en Madrid. Más de quince años tejiendo a mano; desde 2015 de forma profesional.',
  alternates: { canonical: '/sobre-mi' },
};

export default async function About() {
  const settings = await getSettings();
  const photo = settings.owner_photo;
  return (
    <div className="mx-auto grid max-w-[1000px] gap-10 px-5 py-14 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-photo">
        {photo?.key ? (
          <Image src={imageUrl(photo.key)} alt={photo.alt || `${owner.name}, en su taller`} fill priority sizes="(min-width:768px) 40vw, 100vw" className="object-cover" />
        ) : (
          <KilimPlaceholder className="absolute inset-0 h-full w-full" />
        )}
      </div>
      <div className="self-center">
        <p className="label text-turq">Sobre mí</p>
        <h1 className="mt-3 text-[clamp(34px,5vw,52px)]">{owner.name}</h1>
        {settings.owner.show_age && <p className="label mt-2 text-muted">{owner.age} años</p>}
        <div className="mt-6 space-y-5 text-[18px] leading-relaxed">
          {owner.paragraphs.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
        </div>
        <a href={whatsappLink('Hola Hafefa, tengo una idea que no veo en la tienda…')} className="btn btn-primary mt-8">Escríbeme por WhatsApp</a>
      </div>
    </div>
  );
}
