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
        const res = await fetch('/api/news/get?limit=1&sort=newest');
        const json = await res.json();
        if (Array.isArray(json.news) && json.news.length > 0) {
          setLastRun(new Date(json.news[0].date).toLocaleString());
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
      const res = await fetch('/api/fetch-news');
      const json = await res.json();
      setStatus(json.message || json.error || 'Done');
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
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Run Fetch-News
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