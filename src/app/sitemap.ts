import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/catalog';
import { absolute } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cats, products] = await Promise.all([getCategories(), getProducts()]);
  const live = products.filter((p) => p.status === 'published');
  return [
    { url: absolute('/'), changeFrequency: 'weekly', priority: 1 },
    ...['/tienda', '/sobre-mi', '/guia-de-tallas', '/contacto', '/envios', '/devoluciones', '/condiciones', '/privacidad', '/aviso-legal', '/cookies'].map((p) => ({ url: absolute(p), changeFrequency: 'yearly' as const, priority: 0.4 })),
    ...cats.map((c) => ({ url: absolute(`/${c.slug}`), changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...live.map((p) => ({ url: absolute(`/producto/${p.slug}`), changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
