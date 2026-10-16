import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { getSettings } from '@/lib/catalog';
import { whatsappLink } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escríbenos por WhatsApp, email o con el formulario. Hablamos de tu pedido o de la pieza que tienes en mente.',
  alternates: { canonical: '/contacto' },
};

export default async function Contact() {
  const c = (await getSettings()).contact;
  return (
    <div className="mx-auto grid max-w-[1000px] gap-12 px-5 py-14 md:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="label text-turq">Contacto</p>
        <h1 className="mt-3 text-[clamp(34px,5vw,52px)]">Hablemos</h1>
        <p className="mt-4 text-lg text-muted">Pregúntanos por una pieza, un color o una medida, o cuéntanos tu idea.</p>
        <ul className="m-0 mt-8 list-none space-y-4 p-0">
          <li><span className="label block text-[11px] text-muted">WhatsApp</span><a href={whatsappLink()} className="text-lg">+{c.whatsapp.replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4')}</a></li>
          <li><span className="label block text-[11px] text-muted">Email</span><a href={`mailto:${c.email}`} className="text-lg">{c.email}</a></li>
          {c.instagram && <li><span className="label block text-[11px] text-muted">Instagram</span><a href={`https://instagram.com/${c.instagram.replace(/^@/, '')}`} className="text-lg">{c.instagram}</a></li>}
          <li><span className="label block text-[11px] text-muted">Taller</span><span className="text-lg">Madrid</span></li>
        </ul>
      </div>
      <div><h2 className="mb-5 text-2xl">O envíanos un mensaje</h2><ContactForm /></div>
    </div>
  );
}
