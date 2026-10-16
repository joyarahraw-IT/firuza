import Link from 'next/link';
import { deleteReview, setReviewStatus } from './actions';
import { btn, btn2, btnDanger, PageHead } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin';
import { fmtDate } from '@/lib/orders';

const TABS = [['pending', 'Pendientes'], ['approved', 'Aprobadas'], ['rejected', 'Rechazadas']] as const;

export default async function Reviews({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const estado = TABS.some(([k]) => k === sp.estado) ? sp.estado! : 'pending';
  const { data } = await db.from('reviews').select('*, products(name, slug), customers(full_name)').eq('status', estado).order('created_at', { ascending: false }).limit(200);
  return (
    <>
      <PageHead title="Reseñas" />
      <p className="mb-5 max-w-[70ch] text-sm text-muted">Solo los clientes con un pedido entregado pueden dejar una reseña. Las reseñas se muestran en la tienda cuando las apruebas.</p>
      <nav aria-label="Estado" className="mb-6 flex gap-5">
        {TABS.map(([k, l]) => <Link key={k} href={`/admin/resenas?estado=${k}`} aria-current={estado === k ? 'page' : undefined} className={`border-b-2 py-1.5 no-underline ${estado === k ? 'border-turq font-semibold text-ink' : 'border-transparent'}`}>{l}</Link>)}
      </nav>
      <ul className="m-0 list-none space-y-4 p-0">
        {(data ?? []).map((r) => {
          const prod = r.products as { name: string; slug: string } | null;
          return (
            <li key={r.id} className="rounded-lg border border-line bg-surface p-5">
              <p className="text-lg" aria-label={`${r.rating} de 5 estrellas`}>{'★'.repeat(r.rating)}<span className="text-line">{'★'.repeat(5 - r.rating)}</span></p>
              {r.title && <p className="font-semibold">{r.title}</p>}
              <p className="mt-1 whitespace-pre-wrap">{r.body}</p>
              <p className="mt-2 text-sm text-muted">{(r.customers as { full_name: string | null } | null)?.full_name ?? r.author_name ?? 'Cliente'} sobre «{prod?.name}» · {fmtDate(r.created_at)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {r.status !== 'approved' && <form action={setReviewStatus}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value="approved" /><button className={btn}>Aprobar</button></form>}
                {r.status !== 'rejected' && <form action={setReviewStatus}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value="rejected" /><button className={btn2}>Rechazar</button></form>}
                <form action={deleteReview}><input type="hidden" name="id" value={r.id} /><button className={btnDanger}>Eliminar</button></form>
              </div>
            </li>
          );
        })}
        {!data?.length && <li className="text-muted">No hay reseñas aquí.</li>}
      </ul>
    </>
  );
}
