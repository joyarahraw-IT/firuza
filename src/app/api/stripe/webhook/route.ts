import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { emailPaid, supabaseStore } from '@/lib/stripe-store';
import { processStripeEvent } from '@/lib/stripe-webhook';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get('stripe-signature');
  if (!secret || !sig) return NextResponse.json({ error: 'not configured' }, { status: 400 });
  const raw = await req.text(); // the signature is computed over the exact raw body
  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
  try {
    const result = await processStripeEvent(event as never, supabaseStore, emailPaid);
    console.log(`[stripe webhook] ${event.type} ${event.id} -> ${result}`);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    console.error('[stripe webhook]', event.id, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 }); // Stripe retries
  }
}
