import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin';

// Every admin page also calls requireAdmin() itself: a layout alone is not a security boundary.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return <AdminShell email={user.email ?? ''}>{children}</AdminShell>;
}
