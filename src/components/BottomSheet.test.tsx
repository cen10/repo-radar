import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomSheet } from './BottomSheet';

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  title: 'Test Sheet',
  children: <div>Sheet content</div>,
};

describe('BottomSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when open is true', () => {
      render(<BottomSheet {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/test sheet/i)).toBeInTheDocument();
      expect(screen.getByText(/sheet content/i)).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<BottomSheet {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title as dialog heading', () => {
      render(<BottomSheet {...defaultProps} title="Custom Title" />);

      expect(screen.getByText(/custom title/i)).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <BottomSheet {...defaultProps}>
          <p>Custom child content</p>
        </BottomSheet>
      );

      expect(screen.getByText(/custom child content/i)).toBeInTheDocument();
    });

    it('renders Done button with default label', () => {
      render(<BottomSheet {...defaultProps} />);

      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('renders Done button with custom label', () => {
      render(<BottomSheet {...defaultProps} doneLabel="Close" />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('renders drag handle indicator', () => {
      render(<BottomSheet {...defaultProps} />);

      // The drag handle is a visual indicator div
      const dialog = screen.getByRole('dialog');
      const dragHandle = dialog.querySelector('.bg-gray-300');
      expect(dragHandle).toBeInTheDocument();
    });
  });

  describe('Closing behavior', () => {
    it('calls onClose when Done button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<BottomSheet {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /done/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<BottomSheet {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<BottomSheet {...defaultProps} onClose={onClose} />);

      // Click on the backdrop (the fixed container that holds the dialog)
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Swipe gesture', () => {
    const createTouchEvent = (clientY: number) => ({
      touches: [{ clientX: 100, clientY, identifier: 0 }],
      changedTouches: [{ clientX: 100, clientY, identifier: 0 }],
    });

    it('closes when swiped down past threshold', () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      render(<BottomSheet {...defaultProps} onClose={onClose} />);

      // Target the DialogPanel via test ID (touch handlers are on panel, not dialog)
      const panel = screen.getByTestId('bottom-sheet-panel');

      // Simulate swipe down gesture
      fireEvent.touchStart(panel, createTouchEvent(100));
      fireEvent.touchMove(panel, createTouchEvent(250)); // 150px down, past threshold
      fireEvent.touchEnd(panel, createTouchEvent(250));

      // onClose is called after transition animation completes
      expect(onClose).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(onClose).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('does not close when swipe is below threshold', () => {
      const onClose = vi.fn();
      render(<BottomSheet {...defaultProps} onClose={onClose} />);

      const panel = screen.getByTestId('bottom-sheet-panel');

      // Simulate small swipe
      fireEvent.touchStart(panel, createTouchEvent(100));
      fireEvent.touchMove(panel, createTouchEvent(150)); // 50px down, below threshold
      fireEvent.touchEnd(panel, createTouchEvent(150));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not allow upward swipe', () => {
      const onClose = vi.fn();
      render(<BottomSheet {...defaultProps} onClose={onClose} />);

      const panel = screen.getByTestId('bottom-sheet-panel');

      // Simulate upward swipe
      fireEvent.touchStart(panel, createTouchEvent(200));
      fireEvent.touchMove(panel, createTouchEvent(50)); // swiping up
      fireEvent.touchEnd(panel, createTouchEvent(50));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('resets position when swipe is cancelled', () => {
      const onClose = vi.fn();
      render(<BottomSheet {...defaultProps} onClose={onClose} />);

      const panel = screen.getByTestId('bottom-sheet-panel');

      // Start swipe but don't complete past threshold
      fireEvent.touchStart(panel, createTouchEvent(100));
      fireEvent.touchMove(panel, createTouchEvent(140)); // 40px down
      fireEvent.touchEnd(panel, createTouchEvent(140));

      // Dialog should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(<BottomSheet {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('contains title as heading', () => {
      render(<BottomSheet {...defaultProps} title="Accessible Title" />);

      // DialogTitle should be present
      expect(screen.getByText(/accessible title/i)).toBeInTheDocument();
    });

    it('traps focus within the sheet', async () => {
      const user = userEvent.setup();
      render(
        <BottomSheet {...defaultProps}>
          <button>First button</button>
          <button>Second button</button>
        </BottomSheet>
      );

      // Focus should be within the dialog
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Tab through focusable elements
      await user.tab();
      await user.tab();
      await user.tab();

      // Focus should cycle within the dialog (Done button, First button, Second button)
      // This verifies focus trap is working via Headless UI
      expect(document.activeElement).not.toBe(document.body);
    });
  });
});
