// Bizum is offered only when STRIPE_BIZUM_ENABLED=true (the Stripe account must have the capability active).
// next.config.ts inlines the flag so client components see it too.
export const BIZUM = (process.env.NEXT_PUBLIC_BIZUM_ENABLED ?? process.env.STRIPE_BIZUM_ENABLED) === 'true';
/** "tarjeta o Bizum" / "tarjeta" */
export const PAY_METHODS = BIZUM ? 'tarjeta o Bizum' : 'tarjeta';
/** Removes Bizum from texts stored in the database while the flag is off. */
export const stripBizum = (t: string) => (BIZUM ? t : t.replace(/ o Bizum/gi, '').replace(/,? ?Bizum,? ?/gi, ' ').replace(/\s{2,}/g, ' ').trim());
