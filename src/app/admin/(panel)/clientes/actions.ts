'use server';
import { redirect } from 'next/navigation';
import { audit, requireAdmin } from '@/lib/admin';
import { serviceClient } from '@/lib/supabase/server';

/** GDPR erasure of a customer. Orders stay (legal retention) but lose the link to the account; addresses and profile are deleted. */
export async function deleteCustomer(f: FormData) {
  const { user } = await requireAdmin();
  const id = String(f.get('id') ?? '');
  if (f.get('confirm') !== 'on') redirect(`/admin/clientes/${id}?err=Marca+la+casilla+para+confirmar`);
  if (id === user.id) redirect(`/admin/clientes/${id}?err=No+puedes+eliminar+tu+propia+cuenta`);
  if (!process.env.SUPABASE_SECRET_KEY) redirect(`/admin/clientes/${id}?err=Falta+SUPABASE_SECRET_KEY`);
  const svc = serviceClient();
  const { data: isAdmin } = await svc.from('admin_users').select('user_id').eq('user_id', id).maybeSingle();
  if (isAdmin) redirect(`/admin/clientes/${id}?err=Esta+cuenta+es+de+administraci%C3%B3n`);
  const { data: c } = await svc.from('customers').select('email').eq('id', id).maybeSingle();
  const { error } = await svc.auth.admin.deleteUser(id);
  if (error) redirect(`/admin/clientes/${id}?err=No+se+ha+podido+eliminar`);
  await audit('customer_delete', 'customer', id, { email: c?.email });
  redirect('/admin/clientes?ok=eliminado');
}
