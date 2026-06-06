import { TopBar } from '@/components/topbar';
import { requireAuth } from '@/lib/auth';
import { ProfileClient } from './client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const user = await requireAuth();
  return (
    <>
      <TopBar title="Your Profile" breadcrumb="Account" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <ProfileClient user={{ id: user.id, email: user.email, full_name: user.full_name, role: user.role }} />
      </div>
    </>
  );
}
