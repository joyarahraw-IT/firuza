import { redirect } from 'next/navigation';
import { adminLogout } from '@/app/admin/(auth)/actions';
import { MfaSetup } from '@/components/admin/AdminAuthForms';
import { getAdminState } from '@/lib/admin';

export default async function MfaInstall() {
  const s = await getAdminState();
  if (s.status === 'anon' || s.status === 'not_admin') redirect('/admin/login');
  if (s.status === 'ok') redirect('/admin');
  if (s.status === 'needs_mfa') redirect('/admin/2fa');
  return (
    <>
      <h1 className="mb-2 text-3xl">Activa el 2FA</h1>
      <p className="mb-6 text-muted">Por seguridad, el panel exige un código de tu móvil además de la contraseña. Solo se configura una vez.</p>
      <MfaSetup />
      <form action={adminLogout} className="mt-6"><button className="text-sm underline">Cancelar y salir</button></form>
    </>
  );
}
