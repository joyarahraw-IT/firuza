import Image from 'next/image';
import Link from 'next/link';
import { BeadNecklace } from '@/components/BeadNecklace';
import { HeroMosaic } from '@/components/home/Mosaic';
import { CategoryCard, Trust } from '@/components/home/Parts';
import { ProductCard } from '@/components/ProductCard';
import { whatsappLink } from '@/lib/format';
import { getHomeData } from '@/lib/home';
import { imageUrl } from '@/lib/images';
import { absolute, SITE_URL } from '@/lib/site';
import { owner } from '@/content/owner';

// The hero mosaic has a fixed layout; a silent seed per Europe/Madrid date (lib/seed.ts) picks which products fill it. Pages are regenerated at most once a
// minute, so it changes within about a minute after Madrid midnight (and the data stays fresh).
export const revalidate = 60;

export default async function Home() {
  const d = await getHomeData();
  const h2 = 'font-display text-[clamp(32px,5vw,52px)] font-extrabold leading-[0.98] tracking-[-0.025em]';
  const shipLine = (d.steps[2].d2 ?? '').replace('Envío en', 'Llega en');
  const org = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Firuza', url: SITE_URL, logo: absolute('/icon.svg'), email: 'contacto@example.com', founder: { '@type': 'Person', name: 'Nombre Apellido' }, address: { '@type': 'PostalAddress', addressLocality: 'Madrid', addressCountry: 'ES' } };
  const ownerPhoto = d.settings.owner_photo;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />

      <HeroMosaic m={d.mosaic} />

      {/* CATEGORIES: bento, 1 big + 4 small; on phones 1 full-width + 2x2, never an orphan */}
      <section className="mx-auto max-w-[1200px] px-4 pb-16 md:px-10 md:pb-24" aria-labelledby="cat">
        <h2 id="cat" className={`${h2} mb-6`}>Elige por dónde empezar</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {d.blocks.map((t, i) => (
            <CategoryCard key={t.slug} tile={t} big={i === 0} className={i === 0 ? 'col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto' : 'aspect-[4/5]'} />
          ))}
        </div>
      </section>

      {/* A TU MEDIDA: saffron block */}
      <div className="mx-auto max-w-[1200px] px-4 md:px-10"><BeadNecklace height={72} /></div>
      <section className="bg-saffron py-14 text-on-block md:py-20" aria-labelledby="medida">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 md:grid-cols-2 md:px-10">
          <div className="flex flex-col items-start gap-5">
            <span className="label">Hecho a tu medida</span>
            <h2 id="medida" className={`${h2} max-w-[14ch]`}>¿Tienes una idea? Hafefa la teje para ti.</h2>
            <p className="max-w-[48ch] text-lg font-medium">Con hilo, lana, cuentas y piedras hace casi de todo. Cuéntale qué imaginas, en qué color y qué medida, y ella te dice cuánto tarda.</p>
            <a href={whatsappLink('Hola Hafefa, tengo una idea que no veo en la tienda…')} className="btn border-on-block bg-on-block text-white hover:border-on-block hover:bg-on-block/85 hover:text-white">Cuéntale tu idea por WhatsApp</a>
          </div>
          <div className="grid grid-cols-3 gap-3" aria-hidden="true">
            {d.collage.map((p, i) => (
              <div key={p.src} className={`relative aspect-[3/5] overflow-hidden rounded-lg bg-photo ${i === 1 ? 'mt-8' : ''}`}>
                <Image src={p.src} alt="" fill sizes="(min-width:768px) 16vw, 30vw" className={p.whole ? 'object-contain' : 'object-cover'} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 md:px-10"><BeadNecklace height={72} pendant /></div>
      {/* PRODUCTS: 4 on phones, 6 on tablets, 8 on desktop (never an orphan row) */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-10 md:py-24" aria-labelledby="nuevo">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="nuevo" className={h2}>Recién salido de sus manos</h2>
          <Link href="/collares" className="label hidden min-h-11 items-center sm:inline-flex">Ver todo</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-6 wide:grid-cols-4">
          {d.fresh.map((p, i) => (
            <div key={p.slug} className={i >= 6 ? 'hidden wide:block' : i >= 4 ? 'hidden sm:block' : ''}><ProductCard product={p} /></div>
          ))}
        </div>
        <Link href="/collares" className="btn btn-secondary mt-8 w-full sm:hidden">Ver todo</Link>
      </section>

      {/* MAKER: lapis block with the big pull quote; her real work until a real photo of her exists */}
      <section className="bg-granada py-16 text-white md:py-24" aria-labelledby="hafefa">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 md:grid-cols-12 md:px-10">
          <div className="md:col-span-7">
            <span aria-hidden="true" className="block font-display text-[96px] font-extrabold leading-[0.6]">“</span>
            <h2 id="hafefa" className="sr-only">Hecho a mano por Hafefa</h2>
            <blockquote className="m-0 font-display text-[clamp(26px,3.8vw,46px)] font-semibold leading-[1.12] tracking-[-0.015em]">Con hilo, lana, cuentas y piedras hago casi de todo. Cada pieza la hago a mano y la empiezo cuando tú la pides, en el color y la medida que elijas.</blockquote>
            <p className="data mt-6">Nombre Apellido · Afganistán → Madrid · desde 2015</p>
            <Link href="/sobre-mi" className="btn mt-6 border-ground bg-ground text-ink hover:border-ground hover:bg-surface hover:text-ink">Conoce a Hafefa</Link>
          </div>
          <div className="md:col-span-5">
            {ownerPhoto?.key ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-photo">
                <Image src={imageUrl(ownerPhoto.key)} alt={ownerPhoto.alt || `${owner.name}, en su taller`} fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3" aria-hidden="true">
                {d.makerCollage.map((p, i) => (
                  <div key={p.src} className={`relative overflow-hidden rounded-lg bg-photo ${i === 0 ? 'col-span-2 aspect-[4/3]' : 'aspect-square'}`}>
                    <Image src={p.src} alt="" fill sizes="(min-width:768px) 28vw, 46vw" className={p.whole ? 'object-contain' : 'object-cover'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT ARRIVES */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-10 md:py-24" aria-labelledby="llega">
        <h2 id="llega" className={`${h2} mb-8`}>Así llega a tu casa</h2>
        <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
          {d.steps.map((s, i) => (
            <li key={s.t} className={`flex flex-col gap-3 rounded-lg p-7 ${i === 1 ? 'text-on-block' : 'text-white'}`} style={{ background: `var(${['--block-turquesa-ink', '--azafran', '--block-granada'][i]})` }}>
              <span aria-hidden="true" className="font-display text-[56px] font-extrabold leading-none">{i + 1}</span>
              <h3 className="text-[22px] font-bold leading-tight tracking-normal">{s.t}</h3>
              <p className={i ? 'data text-[15px]' : ''}>{s.d}</p>
              {s.d2 && <p className="text-[15px]">{s.d2}</p>}
            </li>
          ))}
        </ol>
      </section>

      {d.reviews.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-4 pb-16 md:px-10" aria-labelledby="op">
          <h2 id="op" className={`${h2} mb-6`}>Lo que dicen quienes ya la tienen</h2>
          <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
            {d.reviews.map((r, i) => (
              <li key={i} className="rounded-lg bg-surface p-6">
                <p aria-label={`${r.rating} de 5 estrellas`}><span aria-hidden="true" className="text-saffron">{'★'.repeat(r.rating)}</span><span aria-hidden="true" className="text-line">{'★'.repeat(5 - r.rating)}</span></p>
                {r.title && <h3 className="mt-1 text-xl font-bold tracking-normal">{r.title}</h3>}
                <p className="mt-1">{r.body}</p>
                <p className="mt-3 text-sm text-ink-muted">{r.author}{r.product && <> · <Link href={`/producto/${r.product.slug}`}>{r.product.name}</Link></>}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* TRUST */}
      <section className="bg-surface py-12 md:py-14" aria-label="Compra con confianza">
        <div className="mx-auto max-w-[1200px] px-4 md:px-10"><Trust shipLine={shipLine} /></div>
      </section>
    </>
  );
}
