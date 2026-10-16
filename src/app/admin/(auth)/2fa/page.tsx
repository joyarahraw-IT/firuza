import { redirect } from 'next/navigation';
import { adminLogout } from '@/app/admin/(auth)/actions';
import { MfaCodeForm } from '@/components/admin/AdminAuthForms';
import { getAdminState } from '@/lib/admin';

export default async function Mfa() {
  const s = await getAdminState();
  if (s.status === 'anon' || s.status === 'not_admin') redirect('/admin/login');
  if (s.status === 'ok') redirect('/admin');
  if (s.status === 'needs_mfa_setup') redirect('/admin/2fa/instalar');
  return (
    <>
      <h1 className="mb-2 text-3xl">Verificación en dos pasos</h1>
      <p className="mb-6 text-muted">Escribe el código de tu app de autenticación.</p>
      <MfaCodeForm />
      <form action={adminLogout} className="mt-6"><button className="text-sm underline">Cancelar y salir</button></form>
    </>
  );
}
