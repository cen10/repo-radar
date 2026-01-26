import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useQueryClient } from '@tanstack/react-query';
import { deleteRadar } from '../services/radar';
import type { Radar } from '../types/database';

interface DeleteRadarModalProps {
  radar: Radar;
  repoCount: number;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteRadarModal({ radar, repoCount, onClose, onDeleted }: DeleteRadarModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteRadar(radar.id);

      // Invalidate caches
      void queryClient.invalidateQueries({ queryKey: ['radars'] });
      void queryClient.invalidateQueries({ queryKey: ['radar', radar.id] });
      void queryClient.invalidateQueries({ queryKey: ['radarRepositories', radar.id] });

      onDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete radar';
      setError(message);
      setIsDeleting(false);
    }
  };

  const repoText = repoCount === 1 ? '1 repository' : `${repoCount} repositories`;

  return (
    <Dialog open={true} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl transition duration-200 data-closed:scale-95 data-closed:opacity-0"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Delete Radar
              </DialogTitle>
              <p className="mt-2 text-sm text-gray-600">
                {`Are you sure you want to delete "${radar.name}"? `}
                {repoCount > 0
                  ? `This will remove ${repoText} from this collection.`
                  : 'This radar is empty.'}
              </p>
              <p className="mt-2 text-sm text-gray-500">This action cannot be undone.</p>

              {error && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex w-[72px] items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-600 disabled:opacity-70"
            >
              {isDeleting ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
