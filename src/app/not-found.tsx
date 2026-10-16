import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export const metadata = { title: 'Página no encontrada', robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <Header />
      <div className="kilim kilim-thin" role="presentation" />
      <main className="mx-auto max-w-[760px] px-5 py-20">
        <p className="label text-turq">Error 404</p>
        <h1 className="mt-3 text-[clamp(34px,5vw,52px)]">No encontramos esa página</h1>
        <p className="mt-4 text-lg text-muted">Puede que el enlace haya cambiado. Prueba con el buscador o vuelve al inicio.</p>
        <div className="mt-8 flex flex-wrap gap-3.5"><Link href="/" className="btn btn-primary">Ir al inicio</Link><Link href="/buscar" className="btn btn-secondary">Buscar</Link></div>
      </main>
      <Footer />
    </>
  );
}
