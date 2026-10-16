import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Mono, Karla } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '@/lib/site';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--font-bricolage', display: 'swap' });
const karla = Karla({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-karla', display: 'swap' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono', display: 'swap' });

// Light is the default. Dark only when the visitor chose it (cookie 'theme=dark', set by ThemeToggle); never in the admin.
// Runs before first paint, so there is no flash and the pages can stay statically cached.
const themeScript = "try{if(!location.pathname.startsWith('/admin')&&/(?:^|; )theme=dark/.test(document.cookie))document.documentElement.dataset.theme='dark'}catch(e){}";

export const metadata: Metadata = {
  title: { default: 'Firuza · Tejidos, bisutería y alfombras hechos a mano', template: '%s · Firuza' },
  description: 'Collares, pulseras, pendientes y crochet hechos a mano en Madrid. Alfombras y kilims ya tejidos. Envío a toda la UE.',
  metadataBase: new URL(SITE_URL),
  openGraph: { type: 'website', locale: 'es_ES', siteName: 'Firuza', images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Firuza: tejidos, bisutería y alfombras hechos a mano' }] },
  twitter: { card: 'summary_large_image' },
};

// Root layout only sets up html/body and fonts. The shop chrome lives in (shop)/layout.tsx and the admin panel
// in admin/layout.tsx, so the two never share a header, a session or a cookie.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bricolage.variable} ${karla.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
