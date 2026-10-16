import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeliveryChip } from '@/components/DeliveryChip';
import { ProductCard } from '@/components/ProductCard';
import { ProductMaterials } from '@/components/ProductMaterials';
import { ProductMeasures } from '@/components/ProductMeasures';
import { KIND_PUBLIC } from '@/lib/materials';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductPurchase, type QuoteConfig } from '@/components/ProductPurchase';
import { getCategories, getProduct, getProducts, getReviews, getSettings, imageUrl, type Product, type Review } from '@/lib/catalog';
import { formatEur } from '@/lib/format';
import { cardPrice } from '@/lib/pricing';
import { guideKeyFor } from '@/lib/guides';
import { showWhole } from '@/lib/images';
import { absolute } from '@/lib/site';
import { PAY_METHODS } from '@/lib/pay-methods';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  const desc = p.description.slice(0, 160);
  const img = absolute(imageUrl(p.images[0].key));
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: { title: p.name, description: desc, type: 'website', images: [{ url: img, alt: p.name }], locale: 'es_ES' },
    twitter: { card: 'summary_large_image', title: p.name, description: desc, images: [img] },
    robots: p.status === 'draft' ? { index: false } : undefined,
  };
}

function jsonLd(p: Product, reviews: Review[]) {
  const prices = p.variants.map((v) => v.price_cents / 100);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.slug,
    image: p.images.map((i) => absolute(imageUrl(i.key))),
    brand: { '@type': 'Brand', name: 'Firuza' },
    ...(reviews.length
      ? {
          aggregateRating: { '@type': 'AggregateRating', ratingValue: +(reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1), reviewCount: reviews.length },
          review: reviews.slice(0, 5).map((r) => ({ '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: r.rating }, author: { '@type': 'Person', name: r.author }, reviewBody: r.body, datePublished: r.created_at.slice(0, 10) })),
        }
      : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: p.variants.length,
      availability: p.delivery_mode === 'shipped' ? 'https://schema.org/InStock' : 'https://schema.org/MadeToOrder',
      url: absolute(`/producto/${p.slug}`),
    },
  };
}

const Acc = ({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) => (
  <details open={open} className="group border-b border-line">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl [&::-webkit-details-marker]:hidden">
      {title}
      <span aria-hidden="true" className="text-2xl text-turq transition-transform group-open:rotate-45">+</span>
    </summary>
    <div className="space-y-3 pb-5 text-[15.5px] leading-relaxed text-muted">{children}</div>
  </details>
);

export default async function ProductPage({ params }: Props) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const [settings, cats, all, reviews] = await Promise.all([getSettings(), getCategories(), getProducts(), getReviews(p.id)]);
  const cat = cats.find((c) => c.slug === p.category);
  const rug = p.delivery_mode === 'shipped';
  const related = all.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);
  const price = cardPrice(p);
  const ship = settings.shipping;
  const pay = settings.payment;
  const rates = settings.shipping_rates;
  const price0 = (c: number) => (c === 0 ? 'gratis' : formatEur(c));
  const silk = rug && /seda/i.test(p.description);
  const ind = settings.rug_industrial;
  const quote: QuoteConfig | undefined = p.option_groups.some((g) => g.quote_values?.length) ? { sizes: ind.sizes, maxM2: ind.max_m2, note: ind.note } : undefined;

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-10 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(p, reviews)).replace(/</g, '\\u003c') }} />
      <nav aria-label="Migas de pan" className="mb-6 text-sm text-muted">
        <Link href="/">Inicio</Link> / {cat && <><Link href={`/${cat.slug}`}>{cat.name}</Link> / </>}
        <span aria-current="page">{p.name}</span>
      </nav>
      {p.status === 'draft' && (
        <p className="mb-6 border border-saffron bg-paper p-3 text-sm text-saffron-text" role="note">
          Borrador: este producto aún no está publicado. Solo lo ves en la vista previa local.
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <ProductGallery
          contain={rug || showWhole(p.images[0].key)}
          images={p.images.map((i) => ({ src: imageUrl(i.key), thumb: imageUrl(i.key, true), alt: i.alt, label: KIND_PUBLIC[i.kind] }))}
        />
        <div>
          <p className="label text-firuza-ink">{rug ? 'Ya tejida' : 'Hecho a mano'}</p>
          <h1 className="mb-4 mt-2 text-[clamp(30px,4vw,44px)]">{p.name}</h1>
          <DeliveryChip className="mb-5" mode={p.delivery_mode} making={p.making_days} shipping={p.shipping_days} />
          <p className="mb-6 max-w-[56ch] text-[17px] text-muted">{p.description}</p>
          <ProductPurchase
            whatsapp={settings.contact.whatsapp}
            quote={quote}
            customFit={guideKeyFor(p) === 'ropa'}
            notes={{ silk: silk ? settings.rug_texts.silk_note : undefined, shipping: rug ? rates.rug_label : undefined }}
            ship={{ es_min: ship.es_min, es_max: ship.es_max, eu_min: ship.eu_min, eu_max: ship.eu_max }}
            product={{
              slug: p.slug, name: p.name, imageKey: p.images[0].key, mode: p.delivery_mode, making: p.making_days, shipping: p.shipping_days,
              colors: p.colors, optionGroups: p.option_groups, variants: p.variants,
            }}
          />
          {price.acrylic && (
            <p className="mt-4 text-sm text-muted">El precio cambia según el material que elijas arriba.</p>
          )}

          <ProductMeasures product={p} guides={settings.size_guides} />
          <ProductMaterials product={p} />

          <div className="mt-10 border-t border-line">
            {p.materials_note && (
              <Acc title="Notas sobre las medidas" open>
                <p>{p.materials_note}</p>
              </Acc>
            )}
            <Acc title="Materiales y cuidados">
              <p>{p.care ?? 'Te indicaremos los cuidados al preparar tu pieza.'}</p>
              <p>Si tienes dudas sobre los materiales, escríbenos antes de pedir.</p>
            </Acc>
            <Acc title="Envío y plazos">
              {rug ? (
                <>
                  <p><strong className="text-ink">Esta pieza ya está tejida.</strong> No se hace bajo pedido: solo tienes que esperar a que llegue, entre {p.shipping_days?.[0]} y {p.shipping_days?.[1]} días.</p>
                  <p>Enviamos a toda la Unión Europea. {rates.rug_label}.</p>
                </>
              ) : (
                <>
                  <p>Esta pieza se hace <strong className="text-ink">después de tu pedido</strong>: {p.making_days?.[0]}–{p.making_days?.[1]} días de elaboración.</p>
                  <p>Después la enviamos: {ship.es_min}–{ship.es_max} días laborables en España peninsular y {ship.eu_min}–{ship.eu_max} en el resto de la UE.</p>
                  <p><strong className="text-ink">Gastos de envío:</strong> Comunidad de Madrid {price0(rates.madrid_cents)}; resto de España peninsular {price0(rates.spain_cents)}; resto de la UE {price0(rates.eu_cents)}; Baleares, Canarias, Ceuta y Melilla: {rates.consult_label.toLowerCase()}.</p>
                </>
              )}
            </Acc>
            <Acc title="Pago">
              <p>{rug ? 'Alfombras y kilims: envías el pedido sin pagar, te confirmamos el envío y te mandamos un enlace de pago seguro (' + PAY_METHODS + ').' : 'Pago seguro con ' + PAY_METHODS + '.'}</p>
              {pay.text && /\[CONFIRMAR/.test(pay.text) && <p className="text-saffron-text">[Pendiente de confirmar los métodos de pago]</p>}
            </Acc>
            {/* LEGAL: to be reviewed by a gestor before going live */}
            <Acc title="Cambios y devoluciones">
              {rug ? (
                <p>Puedes devolver esta alfombra en los 14 días siguientes a recibirla, sin usar y en su estado original. Escríbenos antes de enviarla.</p>
              ) : (
                <p>Las piezas hechas a tu medida o en el color que eliges quedan excluidas del derecho de desistimiento de 14 días (art. 103 TRLGDCU), salvo defecto de fabricación. Si algo llega mal, escríbenos y lo solucionamos.</p>
              )}
            </Acc>
          </div>
        </div>
      </div>

      {reviews.length > 0 && (
        <section className="mt-20" aria-labelledby="ops">
          <h2 id="ops" className="mb-2 text-3xl">Opiniones</h2>
          <p className="mb-6 text-muted"><span aria-hidden="true" className="text-saffron">{'★'.repeat(Math.round(reviews.reduce((n, r) => n + r.rating, 0) / reviews.length))}</span> {(reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1).replace('.', ',')} de 5 · {reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'} de clientes con pedido entregado</p>
          <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-2">
            {reviews.map((r, i) => (
              <li key={i} className="rounded-lg border border-line bg-surface p-5">
                <p aria-label={r.rating + ' de 5 estrellas'}><span aria-hidden="true" className="text-saffron">{'★'.repeat(r.rating)}</span><span aria-hidden="true" className="text-line">{'★'.repeat(5 - r.rating)}</span></p>
                {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
                <p className="mt-1 whitespace-pre-line">{r.body}</p>
                <p className="mt-2 text-sm text-muted">{r.author}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="rel">
          <h2 id="rel" className="mb-7 text-3xl">También te puede gustar</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 wide:grid-cols-4">
            {related.map((r) => <ProductCard key={r.slug} product={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
