import 'server-only';
import { serviceClient } from './supabase/server';

/**
 * Guest orders placed with the same email as a VERIFIED account are attached to that account.
 * Only call it for users whose email is confirmed (email_confirmed_at set), otherwise anyone could claim someone else's orders.
 */
export async function claimGuestOrders(userId: string, email: string) {
  if (!process.env.SUPABASE_SECRET_KEY || !email) return;
  await serviceClient().from('orders').update({ customer_id: userId }).is('customer_id', null).eq('contact_email', email.toLowerCase());
}
