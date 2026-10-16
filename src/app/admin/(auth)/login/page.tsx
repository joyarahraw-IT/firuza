import { redirect } from 'next/navigation';
import { AdminLoginForm } from '@/components/admin/AdminAuthForms';
import { getAdminState } from '@/lib/admin';

export default async function AdminLogin() {
  const s = await getAdminState();
  if (s.status === 'ok') redirect('/admin');
  if (s.status === 'needs_mfa') redirect('/admin/2fa');
  if (s.status === 'needs_mfa_setup') redirect('/admin/2fa/instalar');
  return (
    <>
      <h1 className="mb-6 text-3xl">Entrar</h1>
      <AdminLoginForm />
      <p className="mt-6 text-sm text-muted">Acceso solo para la propietaria. Esta sesión es independiente de la tienda.</p>
    </>
  );
}
