import { AnnouncementBar } from '@/components/AnnouncementBar';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

// Data comes from the database: refresh static shop pages at most once a minute
export const revalidate = 60;

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-cotton focus:p-3">
        Saltar al contenido
      </a>
      <AnnouncementBar />
      <Header />
      <div className="kilim kilim-thin" role="presentation" />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  );
}
