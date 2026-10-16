import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrderConfirmation, type PayState } from '@/components/OrderConfirmation';
import { getSettings } from '@/lib/catalog';
import { serviceClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Pedido recibido', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Confirmed({ searchParams }: { searchParams: Promise<{ n?: string; p?: string }> }) {
  const { n, p } = await searchParams;
  if (!n || !/^[A-Z]{2}-\d{6}-[A-Z2-9]{4}$/.test(n)) redirect('/');
  const rates = (await getSettings()).shipping_rates;

  // "pagado" is shown only once the Stripe webhook has marked the order paid (never because the customer came back from Stripe)
  let pay: PayState = 'request';
  try {
    const { data: o } = await serviceClient().from('orders').select('status, payment_status').eq('number', n).maybeSingle();
    if (o?.payment_status === 'paid') pay = 'paid';
    else if (p === 'ok') pay = 'processing';
    else if (o?.status === 'pendiente_pago') pay = p === 'error' ? 'error' : 'pending';
  } catch { /* no service key configured: plain request confirmation */ }

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-10 py-12">
      <OrderConfirmation number={n} rates={rates} pay={pay} />
    </div>
  );
}
