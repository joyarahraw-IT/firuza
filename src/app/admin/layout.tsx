import type { Metadata } from 'next';

// The admin panel is never indexed and has no shop header/footer. Its session cookie (hv-admin) is separate from the shop's (hv-shop).
export const metadata: Metadata = {
  title: { absolute: 'Administración · Firuza' },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div data-theme="light" className="min-h-screen bg-paper text-ink">{children}</div>;
}
