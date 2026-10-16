import { NextResponse } from 'next/server';
import { audit, requireAdmin } from '@/lib/admin';

/** GDPR data export of one customer (profile, addresses, orders with items and timeline). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const [{ data: customer }, { data: addresses }, { data: orders }, { data: reviews }] = await Promise.all([
    db.from('customers').select('*').eq('id', id).maybeSingle(),
    db.from('addresses').select('*').eq('customer_id', id),
    db.from('orders').select('*, order_items(*), order_status_history(status, note, created_at)').eq('customer_id', id),
    db.from('reviews').select('*').eq('customer_id', id),
  ]);
  if (!customer) return new NextResponse('No encontrado', { status: 404 });
  await audit('customer_export', 'customer', id);
  return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), customer, addresses, orders, reviews }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="cliente-${id.slice(0, 8)}.json"`, 'Cache-Control': 'no-store' },
  });
}
