import { useState } from 'react';
import type { FormEvent } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useQueryClient } from '@tanstack/react-query';
import { createRadar } from '../services/radar';
import type { Radar } from '../types/database';

interface CreateRadarModalProps {
  onClose: () => void;
  onSuccess?: (radar: Radar) => void;
}

const MAX_NAME_LENGTH = 50;

export function CreateRadarModal({ onClose, onSuccess }: CreateRadarModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const radar = await createRadar(trimmedName);

      // Invalidate cache to refresh sidebar
      void queryClient.invalidateQueries({ queryKey: ['radars'] });

      onSuccess?.(radar);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create radar';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const trimmedName = name.trim();
  const isCreateDisabled = !trimmedName || isSubmitting;
  const errorId = error ? 'radar-name-error' : undefined;

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl transition duration-200 data-closed:scale-95 data-closed:opacity-0"
        >
          <DialogTitle className="text-lg font-semibold text-gray-900">Create Radar</DialogTitle>
          <p className="mt-1 text-sm text-gray-500">
            You can add repos to this collection to monitor their activity.
          </p>

          <form onSubmit={handleSubmit} className="mt-4">
            <div>
              <label htmlFor="radar-name" className="sr-only">
                Radar name
              </label>
              <input
                type="text"
                id="radar-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isSubmitting}
                maxLength={MAX_NAME_LENGTH}
                placeholder="e.g., Machine Learning, Web Dev Tools"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                aria-describedby={errorId}
                aria-invalid={error ? 'true' : undefined}
                autoFocus
              />
              <div className="mt-1 flex justify-between">
                <p
                  id="radar-name-error"
                  className={`text-sm text-red-600 ${error ? 'visible' : 'invisible'}`}
                  role="alert"
                  aria-live="polite"
                  aria-hidden={!error}
                >
                  {error || '\u00A0'}
                </p>
                <p
                  className={`text-xs ${name.length >= MAX_NAME_LENGTH ? 'text-red-500' : 'text-gray-400'}`}
                >
                  {name.length} / {MAX_NAME_LENGTH}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreateDisabled}
                className="inline-flex w-[72px] items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-600 disabled:opacity-70"
              >
                {isSubmitting ? (
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
                  'Create'
                )}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
