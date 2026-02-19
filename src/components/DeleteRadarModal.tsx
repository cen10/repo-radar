import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useQueryClient } from '@tanstack/react-query';
import { deleteRadar } from '../services/radar';
import type { Radar } from '../types/database';
import { Button } from './Button';

interface DeleteRadarModalProps {
  radar: Radar;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteRadarModal({ radar, onClose, onDeleted }: DeleteRadarModalProps) {
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

  return (
    <Dialog open={true} onClose={handleClose} className="relative z-modal">
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
                {`Are you sure you want to delete "${radar.name}"? This cannot be undone.`}
              </p>

              {error && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={isDeleting}
              className="w-[72px]"
            >
              Delete
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
