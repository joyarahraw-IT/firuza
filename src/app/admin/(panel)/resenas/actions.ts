'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit, requireAdmin } from '@/lib/admin';

export async function setReviewStatus(f: FormData) {
  const { db } = await requireAdmin();
  const to = String(f.get('to'));
  const id = String(f.get('id'));
  if (!['approved', 'rejected', 'pending'].includes(to)) redirect('/admin/resenas');
  await db.from('reviews').update({ status: to }).eq('id', id);
  await audit(`review_${to}`, 'review', id);
  revalidatePath('/', 'layout');
  redirect('/admin/resenas');
}

export async function deleteReview(f: FormData) {
  const { db } = await requireAdmin();
  const id = String(f.get('id'));
  await db.from('reviews').delete().eq('id', id);
  await audit('review_delete', 'review', id);
  redirect('/admin/resenas');
}
