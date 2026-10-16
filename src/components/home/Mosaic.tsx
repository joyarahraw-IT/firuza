import Image from 'next/image';
import Link from 'next/link';
import type { Mosaic, MosaicTile } from '@/lib/home';
import { formatEur } from '@/lib/format';

/**
 * Home hero, "Mosaico de color": a fixed grid of tiles (6 x 3 on desktop, 4 columns on tablets, a 2-column stack on phones).
 * Photos are real products multiplied onto a light pastel (true colours, never a saturated fill). The layout never changes;
 * the daily seed (lib/home.ts) only decides which products fill it. Slot classes (m-*) are placed in globals.css.
 */
function PhotoTile({ t, slot, sizes, priority = false, contain = false }: { t: MosaicTile; slot: string; sizes: string; priority?: boolean; contain?: boolean }) {
  return (
    <Link href={t.href} className={`tile ${slot} ${contain || t.photo.whole ? 'fit-contain' : ''}`} style={{ background: `var(${t.tile})` }}>
      <Image
        src={t.photo.src}
        alt={t.photo.alt}
        fill
        sizes={sizes}
        {...(priority ? { priority: true, fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
      />
      <span className="tile-label"><i aria-hidden="true" style={{ background: `var(${t.dot})` }} /><span className={t.kind === 'product' ? 'line-clamp-2' : ''}>{t.label}</span></span>
    </Link>
  );
}

export function HeroMosaic({ m }: { m: Mosaic }) {
  const slots = ['m-a', 'm-b', 'm-c', 'm-d', 'm-e', 'm-f'];
  const small = '(min-width:1024px) 200px, (min-width:640px) 25vw, 50vw';
  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-4 pb-14 md:px-10 md:pb-20" aria-label="Destacado">
      <div className="mosaic">
        <div className="tile m-text bg-granada text-white">
          <h1 className="font-display text-[clamp(32px,9vw,46px)] font-extrabold leading-[0.98] tracking-[-0.03em]">Piedra, hilo y paciencia.</h1>
          <p className="font-mono text-[13px] font-medium leading-snug">Hecho a mano por Hafefa · Madrid</p>
        </div>
        {m.necklace && <PhotoTile t={m.necklace} slot="m-big" priority sizes="(min-width:1024px) 400px, (min-width:640px) 50vw, 100vw" />}
        {m.bag && <PhotoTile t={m.bag} slot="m-bag" priority contain sizes={small} />}
        {m.earrings && <PhotoTile t={m.earrings} slot="m-ear" contain sizes={small} />}
        {m.fill.map((t, i) => <PhotoTile key={t.key} t={t} slot={slots[i]} sizes={small} />)}
        <Link href="/tienda" className="tile m-cta bg-block-teal text-white">
          <span className="font-display text-[clamp(26px,3vw,34px)] font-extrabold leading-[1] tracking-[-0.025em]">Ver las {m.count} piezas <span aria-hidden="true">→</span></span>
          {m.minCents != null && <span className="font-mono text-[14px] font-medium">desde {formatEur(m.minCents)}</span>}
        </Link>
      </div>
    </section>
  );
}
