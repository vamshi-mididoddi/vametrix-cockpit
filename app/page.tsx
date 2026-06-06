import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LandingPage } from '@/components/landing/landing';

export const dynamic = 'force-dynamic';

// Public marketing site. Logged-in users are sent straight to their dashboard.
export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    const role = user.role === 'master_admin' ? 'admin' : user.role;
    redirect(role === 'team' ? '/dashboard' : '/dashboard');
  }
  return <LandingPage />;
}
