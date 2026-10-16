import type { Metadata } from 'next';
import { ProductCard } from '@/components/ProductCard';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Buscar', robots: { index: false } };

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
  const words = norm(q).split(/\s+/).filter(Boolean);
  const results = words.length
    ? (await getProducts()).filter((p) => {
        const hay = norm(`${p.name} ${p.description} ${p.colors.map((c) => c.name).join(' ')}`);
        return words.every((w) => hay.includes(w));
      })
    : [];
  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-10 py-12">
      <h1 className="text-[clamp(32px,4.6vw,48px)]">Buscar</h1>
      <form method="get" role="search" className="mt-6 flex max-w-xl gap-3">
        <label className="sr-only" htmlFor="q">Buscar productos</label>
        <input id="q" name="q" defaultValue={q} placeholder="Collar azul, bolso, kilim…" className="min-h-12 flex-1 rounded-sm border border-ink-muted bg-ground px-4 text-base" />
        <button className="btn btn-primary" type="submit">Buscar</button>
      </form>
      {q && (
        <p className="mt-6 text-muted" role="status">
          {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para «{q}»
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 wide:grid-cols-4">
        {results.map((p) => <ProductCard key={p.slug} heading="h2" product={p} />)}
      </div>
    </div>
  );
}
