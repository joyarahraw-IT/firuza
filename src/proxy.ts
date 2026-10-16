import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { lockEnabled, siteLockDecision } from '@/lib/site-lock';

const SESSION_PATHS = ['/cuenta', '/pedido', '/auth', '/admin'];
const NOINDEX = 'noindex, nofollow';

// 1) Hidden-launch lock: with SITE_LOCK=1 every route asks for HTTP Basic Auth (except the Stripe webhook, robots.txt and static files)
//    and every response carries X-Robots-Tag: noindex, nofollow.
// 2) Keeps the Supabase sessions fresh (token refresh needs to write cookies, which Server Components cannot do).
//    The shop and the admin panel have SEPARATE sessions: different cookie names, never shared.
export async function proxy(request: NextRequest) {
  const locked = lockEnabled();
  const path = request.nextUrl.pathname;
  if (locked) {
    const d = siteLockDecision(path, request.headers.get('authorization'));
    if (d === 'challenge') return new NextResponse('Firuza: sitio en pruebas. Acceso restringido.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Firuza", charset="UTF-8"', 'X-Robots-Tag': NOINDEX, 'Cache-Control': 'no-store' } });
    if (d === 'misconfigured') return new NextResponse('SITE_LOCK is on but SITE_LOCK_USER / SITE_LOCK_PASSWORD are not set.', { status: 503, headers: { 'X-Robots-Tag': NOINDEX, 'Cache-Control': 'no-store' } });
  }
  const response = await refreshSession(request, path);
  if (locked) response.headers.set('X-Robots-Tag', NOINDEX);
  return response;
}

async function refreshSession(request: NextRequest, path: string): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !SESSION_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return NextResponse.next();

  let response = NextResponse.next({ request });
  const admin = path.startsWith('/admin');
  const supabase = createServerClient(url, key, {
    cookieOptions: { name: admin ? 'hv-admin' : 'hv-shop' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

// Everything except Next's static assets and image files; the lock itself skips the webhook and robots.txt.
export const config = { matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?)$).*)'] };
