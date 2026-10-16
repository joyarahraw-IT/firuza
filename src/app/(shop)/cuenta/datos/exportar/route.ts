import { NextResponse } from 'next/server';
import { getShopUser } from '@/lib/auth';
import { shopClient } from '@/lib/supabase/server';

/** GDPR export: everything we hold about the logged-in customer, read with their own session (RLS limits it to their rows). */
export async function GET() {
  const user = await getShopUser();
  if (!user) return new NextResponse('No autorizado', { status: 401 });
  const db = await shopClient();
  const { data: orders } = await db.from('orders').select('*, order_items(*), order_status_history(status, note, created_at)').order('placed_at');
  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, name: user.fullName, phone: user.phone },
    addresses: user.addresses,
    orders: orders ?? [],
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="mis-datos-firuza.json"', 'Cache-Control': 'no-store' },
  });
}
