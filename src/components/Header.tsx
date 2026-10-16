import Link from 'next/link';
import { getMessages } from '@/lib/i18n/es';
import { BagButton } from './BagButton';
import { SearchIcon, UserIcon } from './Icons';
import { ThemeToggle } from './ThemeToggle';

export const CATEGORIES = [
  { slug: 'collares', name: 'Collares' },
  { slug: 'pulseras', name: 'Pulseras' },
  { slug: 'pendientes', name: 'Pendientes' },
  { slug: 'tejidos-crochet', name: 'Crochet y tejidos' },
  { slug: 'alfombras-kilims', name: 'Alfombras y kilims' },
  { slug: 'sobre-mi', name: 'Sobre mí' },
] as const;

const iconBtn = 'grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-surface';
const navLink = 'label inline-flex min-h-11 items-center border-b-2 border-transparent text-ink no-underline hover:border-firuza hover:text-ink';

export function Header() {
  const m = getMessages();
  return (
    <header className="bg-ground">
      <div className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between gap-5 px-4 md:px-10">
        <Link href="/" className="flex min-h-11 items-center gap-1.5 font-display text-[32px] font-bold leading-none tracking-[-0.03em] text-ink no-underline hover:text-ink" aria-label={`${m.brand}, inicio`}>
          {m.brand}
          <span aria-hidden="true" className="inline-block h-[11px] w-[11px] rounded-full bg-firuza" />
        </Link>
        <nav aria-label={m.nav.categories} className="hidden gap-6 xl:flex">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className={navLink}>{c.name}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle className={iconBtn} />
          <Link href="/buscar" className={iconBtn} aria-label={m.nav.search}><SearchIcon /></Link>
          <Link href="/cuenta" className={iconBtn} aria-label={m.nav.account}><UserIcon /></Link>
          <BagButton label={m.nav.bag} className={`${iconBtn} !bg-surface`} />
        </div>
      </div>
      <details className="border-y border-line xl:hidden">
        <summary className="label mx-auto flex min-h-11 max-w-[1200px] cursor-pointer list-none items-center gap-2 px-4 text-ink md:px-10 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="text-xl leading-none">☰</span> {m.nav.categories}
        </summary>
        <nav aria-label={`${m.nav.categories} (móvil)`} className="mx-auto flex max-w-[1200px] flex-col border-t border-line px-4 pb-2 md:px-10">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="label flex min-h-12 items-center text-ink no-underline hover:text-ink">{c.name}</Link>
          ))}
        </nav>
      </details>
    </header>
  );
}
