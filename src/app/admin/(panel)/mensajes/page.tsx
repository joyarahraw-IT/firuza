import Link from 'next/link';
import { deleteMessage, setMessageStatus } from './actions';
import { btn2, btnDanger, PageHead, waPhone } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { fmtDateTime } from '@/lib/orders';

const TABS = [['new', 'Nuevos'], ['read', 'Leídos'], ['archived', 'Archivados']] as const;

export default async function Messages({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const estado = TABS.some(([k]) => k === sp.estado) ? sp.estado! : 'new';
  const { data } = await db.from('contact_messages').select('*').eq('status', estado).order('created_at', { ascending: false }).limit(200);
  return (
    <>
      <PageHead title="Mensajes" />
      <nav aria-label="Estado" className="mb-6 flex gap-5">
        {TABS.map(([k, l]) => <Link key={k} href={`/admin/mensajes?estado=${k}`} aria-current={estado === k ? 'page' : undefined} className={`border-b-2 py-1.5 no-underline ${estado === k ? 'border-turq font-semibold text-ink' : 'border-transparent'}`}>{l}</Link>)}
      </nav>
      <ul className="m-0 list-none space-y-4 p-0">
        {(data ?? []).map((m) => (
          <li key={m.id} className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><strong>{m.name}</strong><span className="text-sm text-muted">{fmtDateTime(m.created_at)}</span></div>
            <p className="text-sm text-muted">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
            <p className="mt-3 whitespace-pre-wrap">{m.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={`mailto:${m.email}?subject=${encodeURIComponent('Sobre tu mensaje en Firuza')}`} className={btn2}>Responder por email</a>
              {m.phone && <a href={`https://wa.me/${waPhone(m.phone)}`} target="_blank" rel="noopener" className={btn2}>WhatsApp</a>}
              {m.status !== 'read' && <form action={setMessageStatus}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="to" value="read" /><button className="text-sm underline">Marcar como leído</button></form>}
              {m.status !== 'archived' && <form action={setMessageStatus}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="to" value="archived" /><button className="text-sm underline">Archivar</button></form>}
              {m.status !== 'new' && <form action={setMessageStatus}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="to" value="new" /><button className="text-sm underline">Marcar como nuevo</button></form>}
              <form action={deleteMessage}><input type="hidden" name="id" value={m.id} /><button className={btnDanger}>Eliminar</button></form>
            </div>
          </li>
        ))}
        {!data?.length && <li className="text-muted">No hay mensajes aquí.</li>}
      </ul>
    </>
  );
}
