import type { Metadata } from 'next';
import { AccountNav } from '@/components/AccountNav';
import { AddressForm } from '@/components/AccountForms';
import { requireShopUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Nueva dirección', robots: { index: false } };

export default async function NewAddress() {
  const user = await requireShopUser('/cuenta/direcciones/nueva');
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <AccountNav current="/cuenta/direcciones" name={user.fullName} />
      <h2 className="mb-6 text-3xl">Nueva dirección</h2>
      <AddressForm fallbackName={user.fullName} />
    </div>
  );
}
