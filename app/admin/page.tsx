'use client';

import { useEffect, useState } from 'react';
// Removed Kinde auth and UI button imports for unauthenticated testing

export default function AdminPage() {
  // No auth: simply track state
  const [status, setStatus] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  // Fetch last run timestamp
  useEffect(() => {
    const fetchLast = async () => {
      try {
        const res = await fetch('/api/news?limit=1&sort=newest', { cache: 'no-store' });
        const json = await res.json();
        if (Array.isArray(json.stories) && json.stories.length > 0) {
          const ts = json.stories[0].publishedAt || json.stories[0].createdAt;
          setLastRun(ts ? new Date(ts).toLocaleString() : new Date().toLocaleString());
        }
      } catch (err) {
        console.error('Failed to fetch last run:', err);
      }
    };
    fetchLast();
  }, []);

  // No auth gating for now

  const handleFetch = async () => {
    setStatus('Running fetch...');
    try {
      const res = await fetch('/api/news/fetch', { method: 'GET', cache: 'no-store' });
      const json = await res.json();
      setStatus(json.message || json.error || `Inserted ${json.inserted ?? 0} item(s)`);
      // Update last run
      setLastRun(new Date().toLocaleString());
    } catch (err) {
      console.error(err);
      setStatus('Error running fetch');
    }
  };

  return (
    <main className="min-h-screen p-6 bg-white dark:bg-gray-900 text-black dark:text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <div className="mb-6">
          <p className="mb-1">Last Fetch Run:</p>
          <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {lastRun || 'No runs yet'}
          </p>
        </div>
        <button
          onClick={handleFetch}
          disabled={status === 'Running fetch...'}
          className={`mb-4 px-4 py-2 rounded text-white ${status === 'Running fetch...' ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {status === 'Running fetch...' ? 'Fetching…' : 'Run Fetch-News'}
        </button>
        {status && (
          <div className="mt-2">
            <p>Status: {status}</p>
          </div>
        )}
      </div>
    </main>
  );
}