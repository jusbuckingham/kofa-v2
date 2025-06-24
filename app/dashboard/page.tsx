

import { getUserSession } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await getUserSession();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h1>
      <p className="text-lg">
        Hello, <span className="font-semibold">{user?.given_name || user?.email}</span>!
      </p>
      <p className="mt-2 text-sm text-gray-400">
        You are logged in with Kinde.
      </p>
      <p className="mt-1 text-sm text-gray-500">User ID: {user?.id}</p>
      <p className="mt-1 text-sm text-gray-500">Email: {user?.email}</p>
      {user?.rawUserMetaData?.plan === 'pro' && (
        <p className="mt-2 text-green-500">You're on the Pro plan.</p>
      )}
    </div>
  );
}