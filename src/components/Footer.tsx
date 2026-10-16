import Link from 'next/link';
import { getMessages } from '@/lib/i18n/es';
import { whatsappLink } from '@/lib/format';

const legal = [
  ['Sobre mí', '/sobre-mi'],
  ['Guía de tallas', '/guia-de-tallas'],
  ['Aviso legal', '/aviso-legal'],
  ['Privacidad', '/privacidad'],
  ['Condiciones de venta', '/condiciones'],
  ['Envíos', '/envios'],
  ['Devoluciones', '/devoluciones'],
  ['Cookies', '/cookies'],
] as const;

const link = 'inline-flex min-h-11 items-center text-ink';

export function Footer() {
  const m = getMessages();
  return (
    <footer className="mt-10 bg-surface">
      <div className="kilim" role="presentation" />
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-10">
        <div>
          <p className="font-display text-[28px] font-bold leading-none">
            {m.brand}
            <span aria-hidden="true" className="ml-1.5 inline-block h-2.5 w-2.5 rounded-full bg-firuza" />
          </p>
          <p className="label mt-2 text-ink-muted">{m.tagline}</p>
          <p className="mt-2.5 max-w-[46ch] text-ink-muted">Tejidos y bisutería hechos a mano en Madrid por Nombre Apellido.</p>
        </div>
        <nav aria-label="Información legal">
          <p className="label mb-2 text-ink-muted">Información</p>
          <ul className="m-0 list-none p-0">
            {legal.map(([n, h]) => (
              <li key={h}><Link href={h} className={link}>{n}</Link></li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="label mb-2 text-ink-muted">Contacto</p>
          <ul className="m-0 list-none p-0">
            <li><a href={whatsappLink()} className={link}>WhatsApp</a></li>
            <li><a href="mailto:contacto@example.com" className={link}>contacto@example.com</a></li>
            <li><Link href="/contacto" className={link}>Formulario de contacto</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
