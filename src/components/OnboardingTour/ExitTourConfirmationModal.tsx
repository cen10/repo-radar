import { useRef } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useOnboarding } from '../../contexts/use-onboarding';
import { Button } from '../Button';

/**
 * Confirmation modal shown when users attempt to exit the onboarding tour.
 * Prevents accidental tour dismissal by requiring explicit confirmation.
 */
export function ExitTourConfirmationModal() {
  const { showExitConfirmation, confirmExitTour, cancelExitTour } = useOnboarding();
  const exitButtonRef = useRef<HTMLButtonElement>(null);

  if (!showExitConfirmation) {
    return null;
  }

  return (
    <Dialog
      open={true}
      onClose={cancelExitTour}
      initialFocus={exitButtonRef}
      className="relative z-[10001]"
    >
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <QuestionMarkCircleIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">Exit Tour?</DialogTitle>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to exit the tour? You can restart it anytime from the Help
                menu in the top right corner.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={cancelExitTour}>
              Continue Tour
            </Button>
            <Button ref={exitButtonRef} variant="primary" onClick={confirmExitTour}>
              Exit Tour
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
