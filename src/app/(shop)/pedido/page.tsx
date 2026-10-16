import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/CheckoutForm';
import { getShopUser } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { PAY_METHODS } from '@/lib/pay-methods';

export const metadata: Metadata = { title: 'Enviar pedido', robots: { index: false } };

// reads the customer's session cookie, so this page is rendered per request
export default async function CheckoutPage() {
  const [settings, user] = await Promise.all([getSettings(), getShopUser()]);
  const s = settings.shipping;
  return (
    <div className="mx-auto min-h-[90vh] max-w-[1200px] px-4 md:px-10 py-12">
      <h1 className="mb-2 text-[clamp(32px,4.6vw,48px)]">Enviar pedido</h1>
      <p className="mb-8 max-w-[60ch] text-muted">Pago seguro con {PAY_METHODS}. Alfombras y kilims: nos envías el pedido, te confirmamos el envío y te mandamos un enlace de pago.</p>
      <CheckoutForm
        ship={{ es_min: s.es_min, es_max: s.es_max, eu_min: s.eu_min, eu_max: s.eu_max }}
        rates={settings.shipping_rates}
        user={user && { email: user.email, fullName: user.fullName, phone: user.phone, addresses: user.addresses }}
      />
    </div>
  );
}
