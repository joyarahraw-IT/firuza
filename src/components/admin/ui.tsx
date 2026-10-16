import Link from 'next/link';
import { STATUS_LABEL } from '@/lib/orders';

export const field = 'mt-1.5 block min-h-11 w-full rounded-sm border border-ink-muted bg-ground px-3 text-[15px] text-ink';
export const labelCls = 'block text-sm font-medium';
export const btn = 'inline-flex min-h-10 items-center justify-center border border-firuza-ink bg-firuza-ink px-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-on-firuza-ink no-underline hover:bg-turq-dark';
export const btn2 = 'inline-flex min-h-10 items-center justify-center border border-turq bg-transparent px-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-turq no-underline hover:bg-turq-tint';
export const btnDanger = 'inline-flex min-h-10 items-center justify-center border border-madder bg-transparent px-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-madder hover:bg-surface';

export function PageHead({ title, children, back }: { title: string; children?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-7">
      {back && <p className="mb-2 text-sm"><Link href={back.href}>← {back.label}</Link></p>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[clamp(26px,3.4vw,36px)]">{title}</h1>
        {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

export const Card = ({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) => (
  <section className={`rounded-lg border border-line bg-surface p-5 ${className}`}>
    {title && <h2 className="mb-4 text-xl">{title}</h2>}
    {children}
  </section>
);

const tone: Record<string, string> = {
  pendiente_pago: 'bg-saffron/20 text-saffron-text',
  nuevo: 'bg-saffron/20 text-saffron-text',
  confirmado: 'bg-turq-tint text-turq-dark',
  pagado: 'bg-turq-tint text-turq-dark',
  en_preparacion: 'bg-turq-tint text-turq-dark',
  enviado: 'bg-turq-tint text-turq-dark',
  entregado: 'bg-tile-turquesa text-ink',
  cancelado: 'bg-anar-deep text-on-anar',
};
export const StatusBadge = ({ status }: { status: string }) => (
  <span className={`label inline-block rounded-full px-3 py-1.5 text-[10.5px] ${tone[status] ?? 'bg-paper'}`}>{STATUS_LABEL[status] ?? status}</span>
);

export const Notice = ({ children, kind = 'ok' }: { children: React.ReactNode; kind?: 'ok' | 'error' }) => (
  <p role={kind === 'error' ? 'alert' : 'status'} className={`mb-5 rounded-lg p-3 ${kind === 'ok' ? 'bg-turq-tint text-turq-dark' : 'border border-madder bg-ground text-madder'}`}>{children}</p>
);

/** wa.me link for a customer phone: keeps +country codes, assumes Spain (34) for plain 9-digit numbers. */
export function waPhone(phone: string) {
  const d = phone.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  return d.length === 9 ? `34${d}` : d;
}
