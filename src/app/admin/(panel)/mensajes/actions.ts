'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit, requireAdmin } from '@/lib/admin';

export async function setMessageStatus(f: FormData) {
  const { db } = await requireAdmin();
  const to = String(f.get('to'));
  if (!['new', 'read', 'archived'].includes(to)) redirect('/admin/mensajes');
  await db.from('contact_messages').update({ status: to }).eq('id', String(f.get('id')));
  revalidatePath('/admin/mensajes');
  redirect('/admin/mensajes');
}

export async function deleteMessage(f: FormData) {
  const { db } = await requireAdmin();
  const id = String(f.get('id'));
  await db.from('contact_messages').delete().eq('id', id);
  await audit('message_delete', 'contact_message', id);
  redirect('/admin/mensajes');
}
