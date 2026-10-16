import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type OrderFilters = { estado?: string; q?: string; vencen?: string; pago?: string };
export const ORDER_STATUSES = ['pendiente_pago', 'nuevo', 'confirmado', 'pagado', 'en_preparacion', 'enviado', 'entregado', 'cancelado'] as const;
const IN_PROGRESS = ['pendiente_pago', 'confirmado', 'pagado', 'en_preparacion', 'enviado'];

const clean = (s: string) => s.replace(/[,()%*\\]/g, ' ').trim();

/** Applies the list filters (status, text search, due soon) to an orders query. Used by the list page and the CSV export. */
export function filterOrders<Q>(input: Q, f: OrderFilters): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = input;
  if (f.estado === 'en_curso') query = query.in('status', IN_PROGRESS);
  else if (f.estado && (ORDER_STATUSES as readonly string[]).includes(f.estado)) query = query.eq('status', f.estado);
  if (f.pago === 'paid' || f.pago === 'unpaid') query = query.eq('payment_status', f.pago);
  if (f.vencen === '1') {
    const soon = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    query = query.not('status', 'in', '(entregado,cancelado)').lte('due_date', soon);
  }
  const q = clean(f.q ?? '');
  if (q) query = query.or(`number.ilike.%${q}%,contact_name.ilike.%${q}%,contact_email.ilike.%${q}%,contact_phone.ilike.%${q}%`);
  return query as Q;
}

export type Db = SupabaseClient;
