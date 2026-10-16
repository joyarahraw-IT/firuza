import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogFilters } from '@/components/CatalogFilters';
import { ProductCard } from '@/components/ProductCard';
import { getCategories, getProducts } from '@/lib/catalog';
import { applyFilters, parseFilters, type SearchParams } from '@/lib/filters';

type Props = { params: Promise<{ category: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) return {};
  return { title: cat.name, description: cat.blurb ?? undefined, alternates: { canonical: `/${cat.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) notFound();
  const inCategory = (await getProducts()).filter((p) => p.category === cat.slug);
  const filters = parseFilters(await searchParams);
  const shown = applyFilters(inCategory, filters);

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-10 py-12">
      <p className="label text-turq">Firuza</p>
      <h1 className="mt-2 text-[clamp(32px,4.6vw,48px)]">{cat.name}</h1>
      {cat.blurb && <p className="mt-3 max-w-[60ch] text-lg text-muted">{cat.blurb}</p>}

      <div className="mt-8">
        {inCategory.length > 0 && <CatalogFilters action={`/${cat.slug}`} products={inCategory} filters={filters} />}
        <p className="mt-4 text-sm text-muted" role="status">
          {shown.length} {shown.length === 1 ? 'producto' : 'productos'}
        </p>
      </div>

      {shown.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 wide:grid-cols-4">
          {shown.map((p, i) => (
            <ProductCard key={p.slug} heading="h2" product={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="mt-10 max-w-[56ch] rounded-lg border border-line bg-paper p-6">
          <p className="font-serif text-2xl">{inCategory.length ? 'Ningún producto coincide con esos filtros.' : 'Estamos preparando esta sección.'}</p>
          <p className="mt-2 text-muted">{inCategory.length ? 'Prueba a quitar alguno.' : 'Mientras tanto, escríbenos y te contamos qué podemos hacer para ti.'}</p>
        </div>
      )}
    </div>
  );
}
