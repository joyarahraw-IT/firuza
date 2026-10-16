'use server';
import { z } from 'zod';
import { claimGuestOrders } from '@/lib/claim-orders';
import { sendOrderEmails } from '@/lib/email';
import { isOnlinePayable } from '@/lib/payments';
import { isLockedOut, recordAttempt } from '@/lib/ratelimit';
import { SITE_URL } from '@/lib/site';
import { createCheckoutSession, stripeConfigured } from '@/lib/stripe';
import { serviceClient, shopClient } from '@/lib/supabase/server';

const Input = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre').max(120),
  email: z.string().trim().email('Revisa el email').max(200),
  phone: z.string().trim().min(6, 'Escribe un teléfono de contacto').max(40),
  line1: z.string().trim().min(3, 'Escribe la dirección').max(200),
  line2: z.string().trim().max(200).optional(),
  postal_code: z.string().trim().min(3, 'Escribe el código postal').max(12),
  city: z.string().trim().min(2, 'Escribe la ciudad').max(100),
  province: z.string().trim().max(100).optional(),
  country: z.string().trim().length(2),
  notes: z.string().trim().max(1000).optional(),
  accept: z.literal(true, { message: 'Debes aceptar las condiciones y el plazo de entrega' }),
  website: z.string().max(0), // honeypot: humans leave it empty
  createAccountPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72).optional(),
  saveAddress: z.boolean().optional(),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    qty: z.number().int().min(1).max(10),
    measurements: z.object({ bust_cm: z.number().int().min(60).max(150), waist_cm: z.number().int().min(60).max(150), hip_cm: z.number().int().min(60).max(150) }).optional(),
  })).min(1).max(30),
});

export type PlaceOrderResult =
  | {
      ok: true;
      number: string;
      subtotalCents: number;
      shippingCents: number;
      shippingToConfirm: boolean;
      shippingZone: string;
      totalCents: number;
      estimatedFrom: string;
      estimatedTo: string;
      emailed: boolean;
      accountPending: boolean;
      /** true when the order is waiting for online payment (card/Bizum); checkoutUrl is the Stripe page to send the customer to */
      payOnline: boolean;
      checkoutUrl: string | null;
    }
  | { ok: false; error: string; field?: string };

const MESSAGES: Record<string, string> = {
  terms_not_accepted: 'Debes aceptar las condiciones y el plazo de entrega.',
  empty_or_invalid_bag: 'Tu pedido está vacío.',
  invalid_contact: 'Revisa tu nombre, email y teléfono.',
  invalid_address: 'Revisa la dirección de envío.',
  invalid_quantity: 'Revisa las cantidades.',
  invalid_measurements: 'Revisa las medidas: busto, cintura y cadera deben estar entre 60 y 150 cm.',
  item_unavailable: 'Alguno de los artículos ya no está disponible. Vuelve a tu pedido y revísalo.',
};

/**
 * Saves the order through the database function create_order(): prices, shipping and delivery dates are computed there.
 * Optionally creates a customer account first (checkout "Crear cuenta"); a logged-in customer's order is linked to their account.
 */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue.path[0] ?? '');
    return { ok: false, error: issue.message, field: field === 'createAccountPassword' ? 'password' : field };
  }
  const d = parsed.data;
  const db = await shopClient();
  let accountPending = false;

  if (d.createAccountPassword) {
    if (await isLockedOut('shop', d.email)) return { ok: false, error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' };
    const { data, error } = await db.auth.signUp({
      email: d.email,
      password: d.createAccountPassword,
      options: { data: { full_name: d.name }, emailRedirectTo: `${SITE_URL}/auth/callback?next=/cuenta` },
    });
    await recordAttempt('shop', d.email, !error);
    if (error) {
      const exists = /registered|already/i.test(error.message);
      return { ok: false, field: exists ? 'email' : 'password', error: exists ? 'Ya existe una cuenta con este email. Inicia sesión o compra como invitado.' : 'No hemos podido crear la cuenta: ' + error.message };
    }
    if (data.user && data.user.identities?.length === 0) {
      return { ok: false, field: 'email', error: 'Ya existe una cuenta con este email. Inicia sesión o compra como invitado.' };
    }
    accountPending = !data.session; // email confirmation is required: the order stays a guest order until the email is verified
  }

  const { data, error } = await db.rpc('create_order', {
    p_items: d.items.map((i) => ({ variant_id: i.variantId, qty: i.qty, ...(i.measurements ? { measurements: i.measurements } : {}) })),
    p_contact: { name: d.name, email: d.email, phone: d.phone },
    p_address: { line1: d.line1, line2: d.line2 ?? '', postal_code: d.postal_code, city: d.city, province: d.province ?? '', country: d.country },
    p_notes: d.notes ?? null,
    p_accept: d.accept,
  });
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k));
    if (!code) console.error('[placeOrder]', error.message);
    return { ok: false, error: code ? MESSAGES[code] : 'No hemos podido guardar el pedido. Inténtalo de nuevo o escríbenos por WhatsApp.' };
  }
  const o = data as {
    number: string; subtotal_cents: number; shipping_cents: number; total_cents: number;
    shipping_zone: string; shipping_to_confirm: boolean; estimated_from: string; estimated_to: string;
  };

  // logged in (or just signed up with an instant session): optionally remember the address
  const { data: u } = await db.auth.getUser();
  if (u.user && d.saveAddress) {
    const { data: same } = await db.from('addresses').select('id').eq('customer_id', u.user.id).eq('line1', d.line1).eq('postal_code', d.postal_code).limit(1);
    if (!same?.length) {
      const { count } = await db.from('addresses').select('id', { count: 'exact', head: true }).eq('customer_id', u.user.id);
      await db.from('addresses').insert({
        customer_id: u.user.id, full_name: d.name, phone: d.phone, line1: d.line1, line2: d.line2 || null, postal_code: d.postal_code,
        city: d.city, province: d.province || null, country: d.country, is_default: !count,
      });
    }
  }
  if (u.user?.email_confirmed_at && u.user.email) await claimGuestOrders(u.user.id, u.user.email);

  const { payOnline, checkoutUrl } = await startOnlinePayment(o.number);
  // paid orders get their confirmation from the Stripe webhook; request orders (rugs, islands) and no-Stripe setups email now
  const emailed = payOnline ? false : await sendOrderEmails(o.number);
  return {
    ok: true,
    number: o.number,
    subtotalCents: o.subtotal_cents,
    shippingCents: o.shipping_cents,
    shippingToConfirm: o.shipping_to_confirm,
    shippingZone: o.shipping_zone,
    totalCents: o.total_cents,
    estimatedFrom: o.estimated_from,
    estimatedTo: o.estimated_to,
    emailed,
    accountPending,
    payOnline,
    checkoutUrl,
  };
}

/** Fully priced orders: mark them "pendiente de pago" and open a Stripe Checkout Session. Anything else stays a request. Never throws. */
async function startOnlinePayment(number: string): Promise<{ payOnline: boolean; checkoutUrl: string | null }> {
  if (!stripeConfigured()) return { payOnline: false, checkoutUrl: null };
  try {
    const db = serviceClient();
    const { data: ord } = await db.from('orders').select('id, total_cents, shipping_to_confirm, shipping_zone, order_items(delivery_mode)').eq('number', number).single();
    if (!ord || !isOnlinePayable(ord)) return { payOnline: false, checkoutUrl: null };
    await db.from('orders').update({ status: 'pendiente_pago' }).eq('id', ord.id);
    try {
      return { payOnline: true, checkoutUrl: (await createCheckoutSession(ord.id)).url };
    } catch (e) {
      console.error('[placeOrder] stripe session failed', e instanceof Error ? e.message : e); // the order page offers a retry
      return { payOnline: true, checkoutUrl: null };
    }
  } catch (e) {
    console.error('[placeOrder] payment setup failed', e instanceof Error ? e.message : e);
    return { payOnline: false, checkoutUrl: null };
  }
}
