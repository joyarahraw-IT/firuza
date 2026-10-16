import type { Metadata } from 'next';
import Link from 'next/link';
import { deleteAddress, makeDefaultAddress } from '@/app/(shop)/cuenta/actions';
import { AccountNav } from '@/components/AccountNav';
import { requireShopUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Mis direcciones', robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireShopUser('/cuenta/direcciones');
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <AccountNav current="/cuenta/direcciones" name={user.fullName} />
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-3xl">Direcciones</h2>
        <Link href="/cuenta/direcciones/nueva" className="btn btn-primary">Añadir dirección</Link>
      </div>
      {user.addresses.length === 0 ? (
        <p className="max-w-[52ch] rounded-lg border border-line bg-paper p-6 text-muted">No tienes direcciones guardadas. Se guardan al hacer un pedido si marcas la casilla, o puedes añadirlas aquí.</p>
      ) : (
        <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
          {user.addresses.map((a) => (
            <li key={a.id} className="rounded-lg border border-line bg-surface p-5">
              <p className="label text-[11px] text-turq">{a.label || 'Dirección'}{a.is_default ? ' · Principal' : ''}</p>
              <p className="mt-2">{a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.postal_code} {a.city}{a.province ? ` (${a.province})` : ''}, {a.country}{a.phone && <><br />{a.phone}</>}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <Link href={`/cuenta/direcciones/${a.id}`}>Editar</Link>
                {!a.is_default && <form action={makeDefaultAddress}><input type="hidden" name="id" value={a.id} /><button className="underline">Hacer principal</button></form>}
                <form action={deleteAddress}><input type="hidden" name="id" value={a.id} /><button className="text-madder underline">Eliminar</button></form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
