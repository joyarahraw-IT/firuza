import type { Metadata } from 'next';
import { ProductCard } from '@/components/ProductCard';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Todas las piezas', alternates: { canonical: '/tienda' } };

export default async function Tienda() {
  const products = await getProducts();
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-10">
      <p className="label text-turq">Firuza</p>
      <h1 className="mt-2 text-[clamp(32px,4.6vw,48px)]">Todas las piezas</h1>
      <p className="mt-4 text-sm text-muted" role="status">{products.length} {products.length === 1 ? 'producto' : 'productos'}</p>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 wide:grid-cols-4">
        {products.map((p, i) => <ProductCard key={p.slug} heading="h2" product={p} priority={i < 4} />)}
      </div>
    </div>
  );
}
