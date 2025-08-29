'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiTrash2 } from 'react-icons/fi';

interface RemoveFavoriteButtonProps {
  storyId: string;
  className?: string;
}

export default function RemoveFavoriteButton({ storyId, className }: RemoveFavoriteButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRemove = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/favorites?storyId=${storyId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to remove favorite');
      }
      router.refresh();
    } catch (err: unknown) {
      console.error('Error removing favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      aria-busy={loading}
      aria-label="Remove from favorites"
      className={`text-red-500 hover:text-red-700 text-sm flex items-center gap-1 ${className ?? ''}`}
    >
      <FiTrash2 size={16} />
      {loading ? 'Removing...' : 'Remove'}
    </button>
  );
}