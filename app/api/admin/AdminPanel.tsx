"use client";

import { useState } from 'react';

export default function AdminPanel() {
  const [message, setMessage] = useState<string>('');

  const runFetch = async () => {
    setMessage('Running fetch...');
    const res = await fetch('/api/admin/fetch');
    const data = await res.json();
    setMessage(data.ok ? `Inserted ${data.inserted}` : `Error: ${data.error}`);
  };

  const runCleanup = async () => {
    setMessage('Running cleanup...');
    const res = await fetch('/api/admin/cleanup');
    const data = await res.json();
    setMessage(data.ok ? `Deleted ${data.deleted}` : `Error: ${data.error}`);
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-4">
      <button
        onClick={runFetch}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Run Fetch Pipeline
      </button>
      <button
        onClick={runCleanup}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Cleanup Old Stories
      </button>
      {message && <p className="mt-2 text-gray-800">{message}</p>}
    </div>
  );
}