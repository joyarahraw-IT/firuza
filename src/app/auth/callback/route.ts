import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth';
import { claimGuestOrders } from '@/lib/claim-orders';
import { shopClient } from '@/lib/supabase/server';

/** Landing point of email links (magic link, confirm account, password reset). Exchanges the code for a SHOP session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));
  if (code) {
    const db = await shopClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await db.auth.getUser();
      // the email link proves the address is theirs: attach earlier guest orders to this account
      if (data.user?.email_confirmed_at && data.user.email) await claimGuestOrders(data.user.id, data.user.email);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/cuenta/entrar?error=enlace`);
}
