import type { Metadata } from 'next';
import { AccountNav } from '@/components/AccountNav';
import { DeleteAccountForm, NewPasswordForm, ProfileForm } from '@/components/AccountForms';
import { requireShopUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Mis datos', robots: { index: false } };

export default async function DataPage() {
  const user = await requireShopUser('/cuenta/datos');
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <AccountNav current="/cuenta/datos" name={user.fullName} />
      <div className="space-y-14">
        <ProfileForm name={user.fullName} phone={user.phone} email={user.email} />
        <NewPasswordForm title="Cambiar contraseña" />
        <section aria-labelledby="priv" className="max-w-xl space-y-4">
          <h2 id="priv" className="text-2xl">Privacidad</h2>
          <p className="text-muted">Tienes derecho a acceder a tus datos y a borrarlos (RGPD).</p>
          <a href="/cuenta/datos/exportar" className="btn btn-secondary" download>Descargar mis datos (JSON)</a>
          <DeleteAccountForm />
        </section>
      </div>
    </div>
  );
}
