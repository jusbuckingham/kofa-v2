"use client";

import { useState } from 'react';

export default function AdminPanel() {
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const runFetch = async () => {
    setMessage('Running fetch...');
    setStatus('running');
    const res = await fetch('/api/admin/fetch');
    const data = await res.json();
    if (data.ok) {
      setMessage(`Inserted ${data.inserted}`);
      setStatus('success');
    } else {
      setMessage(`Error: ${data.error}`);
      setStatus('error');
    }
  };

  const runCleanup = async () => {
    setMessage('Running cleanup...');
    setStatus('running');
    const res = await fetch('/api/admin/cleanup');
    const data = await res.json();
    if (data.ok) {
      setMessage(`Deleted ${data.deleted}`);
      setStatus('success');
    } else {
      setMessage(`Error: ${data.error}`);
      setStatus('error');
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-4 text-center">
      <button
        onClick={runFetch}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Fetch Latest Stories
      </button>
      <button
        onClick={runCleanup}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Cleanup Old Stories
      </button>
      {message && (
        <p
          className={`mt-2 ${
            status === 'running'
              ? 'text-gray-500'
              : status === 'success'
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}