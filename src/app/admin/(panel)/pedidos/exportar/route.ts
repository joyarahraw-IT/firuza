import { NextResponse, type NextRequest } from 'next/server';
import { audit, requireAdmin } from '@/lib/admin';
import { filterOrders } from '@/lib/admin-orders';
import { STATUS_LABEL } from '@/lib/orders';

// CSV for Excel in Spain: UTF-8 with BOM, ";" separator. Cells starting with = + - @ are neutralised (CSV injection).
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const eur = (c: number) => (c / 100).toFixed(2).replace('.', ',');

export async function GET(req: NextRequest) {
  const { db } = await requireAdmin();
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { data } = await filterOrders(db.from('orders').select('*, order_items(name, options, quantity)'), sp).order('placed_at', { ascending: false }).limit(5000);
  const head = ['Pedido', 'Fecha', 'Estado', 'Cliente', 'Email', 'Teléfono', 'Dirección', 'CP', 'Ciudad', 'País', 'Productos', 'Subtotal', 'Envío', 'Total', 'Envío a confirmar', 'Llegada estimada', 'Fecha prometida', 'Seguimiento', 'Forma de pago', 'Estado del pago', 'ID Stripe', 'Nota del cliente'];
  const rows = (data ?? []).map((o) => {
    const a = o.shipping_address as { line1: string; line2?: string; postal_code: string; city: string; country: string };
    const items = (o.order_items as { name: string; options: Record<string, string>; quantity: number }[])
      .map((i) => `${i.quantity} x ${i.name}${Object.keys(i.options).length ? ` (${Object.values(i.options).join(', ')})` : ''}`).join(' | ');
    return [o.number, o.placed_at.slice(0, 10), STATUS_LABEL[o.status], o.contact_name, o.contact_email, o.contact_phone, `${a.line1}${a.line2 ? ', ' + a.line2 : ''}`, a.postal_code, a.city, a.country, items,
      eur(o.subtotal_cents), eur(o.shipping_cents), eur(o.total_cents), o.shipping_to_confirm ? 'Sí' : 'No', `${o.estimated_from ?? ''} / ${o.estimated_to ?? ''}`, o.due_date ?? '', o.tracking_number ?? '', o.payment_method ?? '', o.payment_status === 'paid' ? 'Pagado' : 'Sin pagar', o.stripe_payment_intent_id ?? o.stripe_session_id ?? '', o.notes ?? ''];
  });
  await audit('export_orders_csv', 'orders', null, { rows: rows.length, filters: sp });
  const body = '﻿' + [head, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="pedidos-firuza-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' },
  });
}
