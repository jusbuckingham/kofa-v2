// app/admin/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminPanel from './AdminPanel';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/signin');
  }

  return (
    <main className="py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Admin Tools</h1>
      <AdminPanel />
    </main>
  );
}