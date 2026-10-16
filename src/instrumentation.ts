// Runs once when the server starts. Warns loudly when NEXT_PUBLIC_SITE_URL points to another port/host than the one we listen on
// (that is how a Stripe Checkout return URL ended up on a dead localhost:3000).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') (await import('./lib/site-url-check')).checkSiteUrl();
}
