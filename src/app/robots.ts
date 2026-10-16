import type { MetadataRoute } from 'next';
import { lockEnabled } from '@/lib/site-lock';
import { absolute } from '@/lib/site';

// While the hidden-launch lock is on (SITE_LOCK=1) nothing may be crawled. robots.txt itself is exempt from the password so crawlers can read this.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (lockEnabled()) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/bolsa', '/pedido', '/cuenta'] }],
    sitemap: absolute('/sitemap.xml'),
  };
}
