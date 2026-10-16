import { notFound } from 'next/navigation';
import { LEGAL_META, defaultSections, parseCustom, type LegalKey } from '@/content/legal';
import { getLegalOwner, getSettings } from '@/lib/catalog';

export async function legalMetadata(key: LegalKey) {
  const m = LEGAL_META[key];
  return { title: m.title, description: m.description, alternates: { canonical: `/${key}` } };
}

export async function LegalDoc({ docKey }: { docKey: LegalKey }) {
  const meta = LEGAL_META[docKey];
  if (!meta) notFound();
  const [s, owner] = await Promise.all([getSettings(), getLegalOwner()]);
  const custom = (s.legal_texts?.[meta.setting] ?? '').trim();
  const sections = custom
    ? parseCustom(custom)
    : defaultSections(docKey, {
        name: owner.name, nie: docKey === 'aviso-legal' ? owner.nie : '', email: owner.email, address: owner.address,
        whatsapp: s.contact.whatsapp, rates: s.shipping_rates, ship: s.shipping, rugDays: { min: s.rug_shipping.min, max: s.rug_shipping.max },
        payment: s.payment.methods ?? [],
      });
  return (
    <article className="mx-auto max-w-[760px] px-5 py-14">
      <p className="label text-turq">Información legal</p>
      <h1 className="mb-8 mt-3 text-[clamp(32px,4.6vw,46px)]">{meta.title}</h1>
      <div className="space-y-8 text-[17px] leading-relaxed">
        {sections.map((sec, i) => (
          <section key={i}>
            {sec.h && <h2 className="mb-3 text-2xl">{sec.h}</h2>}
            {sec.p.map((p, k) => <p key={k} className="mb-3 whitespace-pre-line">{p}</p>)}
            {sec.list && <ul className="m-0 list-disc space-y-2 pl-6">{sec.list.map((l) => <li key={l}>{l}</li>)}</ul>}
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-muted">Última actualización: octubre de 2026.</p>
    </article>
  );
}
