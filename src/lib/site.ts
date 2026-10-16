export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const absolute = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);
