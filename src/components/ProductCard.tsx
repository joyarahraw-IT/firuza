import Image from 'next/image';
import Link from 'next/link';
import { imageUrl, type Product } from '@/lib/catalog';
import { showWhole } from '@/lib/images';
import { isJewellery, mainStone } from '@/lib/materials';
import { formatEur } from '@/lib/format';
import { cardPrice, setPrice } from '@/lib/pricing';
import { DeliveryChip } from './DeliveryChip';
import { PriceBlock } from './PriceBlock';

export function ProductCard({ product, priority = false, heading: Heading = 'h3', showSet = false }: { product: Product; priority?: boolean; heading?: 'h2' | 'h3'; showSet?: boolean }) {
  const cover = product.images.find((i) => i.cover) ?? product.images[0];
  const inHand = product.images.find((i) => i.kind === 'in_hand' && i.key !== cover.key);
  const stone = isJewellery(product.category) ? mainStone(product.materials) : null;
  const set = showSet ? setPrice(product) : null;
  const rug = product.category === 'alfombras-kilims';
  return (
    <Link href={`/producto/${product.slug}`} className="lift group flex flex-col gap-2.5 text-ink no-underline hover:text-ink">
      <div className="photo-frame relative aspect-[4/5] motion-reduce:!transform-none">
        <Image
          src={imageUrl(cover.key, !rug)}
          alt={cover.alt || product.name}
          fill
          sizes="(min-width:1200px) 22vw, (min-width:768px) 31vw, 48vw"
          priority={priority}
          className={rug || showWhole(cover.key) ? 'object-contain' : 'object-cover object-center'}
        />
        {inHand && (
          // desktop with a mouse only: cross-fade to the real in-hand photo
          <Image src={imageUrl(inHand.key, true)} alt="" fill sizes="(min-width:1200px) 22vw, 31vw" loading="lazy" className="object-cover object-center opacity-0 transition-opacity duration-300 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100" />
        )}
      </div>
      <Heading className="mt-1 font-display text-[17px] font-bold leading-tight tracking-normal">{product.name}</Heading>
      {set ? (
        <div>
          <p className="data flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-anar-text">
            <span className="font-sans text-[13px] font-normal text-ink-muted">Conjunto</span>
            <span className="whitespace-nowrap">{formatEur(set.cents).replace(/ /g, " ")}</span>
            <span className="whitespace-nowrap rounded-full bg-anar-deep px-2 py-0.5 font-sans text-[12px] font-bold text-on-anar">−10 %</span>
          </p>
          <p className="mt-1 text-[13px] text-ink-muted">Solo collar {formatEur(set.soloCents)}</p>
        </div>
      ) : (
        <PriceBlock price={cardPrice(product)} />
      )}
      {stone && <span className="w-fit rounded-full border border-ink-muted px-3 py-1 text-[12px] font-medium text-ink">{stone}</span>}
      <DeliveryChip compact mode={product.delivery_mode} making={product.making_days} shipping={product.shipping_days} />
      {product.colors.length > 0 && (
        <div className="flex gap-1.5" role="img" aria-label={`Colores: ${product.colors.map((c) => c.name).join(', ')}`}>
          {product.colors.map((c) => (
            <i key={c.name} className="h-3.5 w-3.5 rounded-full border border-ink/30" style={{ background: c.hex }} />
          ))}
        </div>
      )}
    </Link>
  );
}
