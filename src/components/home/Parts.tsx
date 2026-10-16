import Image from 'next/image';
import Link from 'next/link';
import type { Photo } from '@/lib/home';
import { KilimPlaceholder } from '../KilimPlaceholder';

export type Tile = { slug: string; name: string; count: number; block: string; photo: Photo | null };

/**
 * Category card: the photo stays 100 % clean. Name + piece count sit in a solid ink label (white on rgba(36,26,46,.92), radius-bead),
 * bottom-left, 14px from the edges, with the category bead dot inside. Hover/focus: 4px underline in the category colour, lift 4px.
 */
export function CategoryCard({ tile, className = '', big = false }: { tile: Tile; className?: string; big?: boolean }) {
  return (
    <Link
      href={`/${tile.slug}`}
      className={`group relative block overflow-hidden rounded-lg bg-photo no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1 focus-visible:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      {tile.photo ? (
        <Image src={tile.photo.src} alt={tile.photo.alt} fill sizes={big ? '(min-width:768px) 50vw, 100vw' : '(min-width:1200px) 25vw, 46vw'} className={tile.photo.whole ? 'object-contain' : 'object-cover'} />
      ) : (
        <KilimPlaceholder className="absolute inset-0 h-full w-full" />
      )}
      <span className="absolute bottom-[14px] left-[14px] block max-w-[calc(100%-28px)] rounded-[999px] bg-[rgba(36,26,46,0.92)] px-4 py-3 text-white">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/60" style={{ background: `var(${tile.block})` }} />
          <span className={`block font-display font-bold leading-tight tracking-[-0.01em] ${big ? 'text-[clamp(20px,3.4vw,30px)]' : 'text-[clamp(15px,3.8vw,20px)]'}`}>
            <span className="border-b-4 border-transparent pb-0.5 group-hover:[border-color:var(--cat)] group-focus-visible:[border-color:var(--cat)]" style={{ ['--cat' as string]: `var(${tile.block})` }}>{tile.name}</span>
          </span>
        </span>
        <span className="data mt-1 block pl-5 text-[12px] text-white sm:text-[13px]">{!tile.photo || tile.count === 0 ? 'Muy pronto' : `${tile.count} ${tile.count === 1 ? 'pieza' : 'piezas'}`}</span>
      </span>
    </Link>
  );
}

const icon = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

/** Trust strip: secure payment, EU shipping, 14-day returns (facts from the shop's own legal texts). */
export function Trust({ shipLine, className = '' }: { shipLine: string; className?: string }) {
  const items = [
    { t: 'Pago seguro', d: 'Con tarjeta, Apple Pay o Google Pay. Los datos de tu tarjeta no los vemos nosotros.', i: <svg {...icon}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg> },
    { t: 'Envío a toda la UE', d: shipLine, i: <svg {...icon}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg> },
    { t: 'Devoluciones en 14 días', d: 'Alfombras y kilims sin usar. Lo hecho a tu medida solo se devuelve si llega con defecto.', i: <svg {...icon}><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg> },
  ];
  return (
    <ul className={`m-0 grid list-none gap-6 p-0 md:grid-cols-3 ${className}`}>
      {items.map((x) => (
        <li key={x.t} className="flex gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface text-firuza-ink">{x.i}</span>
          <span><span className="block font-display text-lg font-bold tracking-normal">{x.t}</span><span className="mt-1 block text-[15px] text-ink-muted">{x.d}</span></span>
        </li>
      ))}
    </ul>
  );
}
