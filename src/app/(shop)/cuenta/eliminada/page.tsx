import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Cuenta eliminada', robots: { index: false } };

export default function Deleted() {
  return (
    <div className="mx-auto max-w-[760px] px-5 py-16">
      <h1 className="text-[clamp(32px,4.6vw,48px)]">Tu cuenta se ha eliminado</h1>
      <p className="mt-4 text-lg text-muted">Hemos borrado tu cuenta y tus direcciones guardadas. Gracias por haber confiado en Firuza.</p>
      <Link href="/" className="btn btn-primary mt-8">Volver al inicio</Link>
    </div>
  );
}
