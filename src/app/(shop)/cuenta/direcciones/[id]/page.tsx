import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccountNav } from '@/components/AccountNav';
import { AddressForm } from '@/components/AccountForms';
import { requireShopUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Editar dirección', robots: { index: false } };

export default async function EditAddress({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireShopUser(`/cuenta/direcciones/${id}`);
  const a = user.addresses.find((x) => x.id === id);
  if (!a) notFound();
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-12">
      <AccountNav current="/cuenta/direcciones" name={user.fullName} />
      <h2 className="mb-6 text-3xl">Editar dirección</h2>
      <AddressForm a={a} />
    </div>
  );
}
