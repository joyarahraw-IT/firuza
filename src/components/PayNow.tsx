'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { payOrder } from '@/app/(shop)/pedido/pagar';

/** Re-checks the order every 3 s (up to ~1 min) while we wait for Stripe's webhook to confirm the payment. */
export function PaymentPoller() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => { if (++n > 20) clearInterval(t); else router.refresh(); }, 3000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}

export function PayButton({ number, label = 'Pagar ahora' }: { number: string; label?: string }) {
  return (
    <form action={payOrder}>
      <input type="hidden" name="number" value={number} />
      <button className="btn btn-primary">{label}</button>
    </form>
  );
}
