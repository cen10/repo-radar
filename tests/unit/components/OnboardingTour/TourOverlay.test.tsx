import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourOverlay } from '@/components/OnboardingTour/TourOverlay';

const defaultProps = {
  target: '[data-tour="test-target"]',
  content: 'This is a test tooltip',
  placement: 'bottom' as const,
  currentStep: 0,
  totalSteps: 5,
  onNext: vi.fn(),
  onPrev: vi.fn(),
  onSkip: vi.fn(),
  isFirst: true,
  isLast: false,
};

describe('TourOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when target element is not found', () => {
    it('renders centered fallback dialog', async () => {
      render(<TourOverlay {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(500);

      expect(screen.getByText('This is a test tooltip')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skip tour/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('shows step counter', async () => {
      render(<TourOverlay {...defaultProps} currentStep={2} totalSteps={10} />);
      await vi.advanceTimersByTimeAsync(500);

      expect(screen.getByText('3/10')).toBeInTheDocument();
    });
  });

  describe('when target is empty string (welcome step)', () => {
    it('renders centered fallback dialog', async () => {
      render(<TourOverlay {...defaultProps} target="" />);
      await vi.advanceTimersByTimeAsync(500);

      expect(screen.getByText('This is a test tooltip')).toBeInTheDocument();
    });
  });

  describe('when target element exists in DOM', () => {
    // jsdom doesn't support layout (getBoundingClientRect returns zeros)
    // so TourOverlay falls back to centered mode. We verify content still renders.
    beforeEach(() => {
      const targetEl = document.createElement('div');
      targetEl.setAttribute('data-tour', 'test-target');
      document.body.appendChild(targetEl);
      targetEl.scrollIntoView = vi.fn();
    });

    afterEach(() => {
      const el = document.querySelector('[data-tour="test-target"]');
      if (el) document.body.removeChild(el);
    });

    it('renders tooltip content regardless of layout engine', async () => {
      render(<TourOverlay {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(500);

      expect(screen.getByText('This is a test tooltip')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('scrolls target into view', async () => {
      render(<TourOverlay {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(500);

      const el = document.querySelector('[data-tour="test-target"]');
      expect(el!.scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('controls', () => {
    it('does not show Back button on first step', async () => {
      render(<TourOverlay {...defaultProps} isFirst={true} />);
      await vi.advanceTimersByTimeAsync(500);

      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('shows Back button on non-first step', async () => {
      render(<TourOverlay {...defaultProps} isFirst={false} currentStep={1} />);
      await vi.advanceTimersByTimeAsync(500);

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('shows Finish button on last step', async () => {
      render(<TourOverlay {...defaultProps} isLast={true} />);
      await vi.advanceTimersByTimeAsync(500);

      expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^next$/i })).not.toBeInTheDocument();
    });

    it('calls onNext when Next is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TourOverlay {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(500);

      await user.click(screen.getByRole('button', { name: /next/i }));

      expect(defaultProps.onNext).toHaveBeenCalledOnce();
    });

    it('calls onPrev when Back is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TourOverlay {...defaultProps} isFirst={false} currentStep={2} />);
      await vi.advanceTimersByTimeAsync(500);

      await user.click(screen.getByRole('button', { name: /back/i }));

      expect(defaultProps.onPrev).toHaveBeenCalledOnce();
    });

    it('calls onSkip when Skip tour is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TourOverlay {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(500);

      await user.click(screen.getByRole('button', { name: /skip tour/i }));

      expect(defaultProps.onSkip).toHaveBeenCalledOnce();
    });

    it('calls onSkip when Finish is clicked on last step', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TourOverlay {...defaultProps} isLast={true} />);
      await vi.advanceTimersByTimeAsync(500);

      await user.click(screen.getByRole('button', { name: /finish/i }));

      expect(defaultProps.onSkip).toHaveBeenCalledOnce();
    });
  });

  describe('keyboard navigation', () => {
    it('calls onSkip on Escape', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TourOverlay {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(500);

      await user.keyboard('{Escape}');

      expect(defaultProps.onSkip).toHaveBeenCalledOnce();
    });

    it('calls onNext on ArrowRight', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TourOverlay {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(500);

      await user.keyboard('{ArrowRight}');

      expect(defaultProps.onNext).toHaveBeenCalledOnce();
    });

    it('calls onPrev on ArrowLeft when not first', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TourOverlay {...defaultProps} isFirst={false} currentStep={2} />);
      await vi.advanceTimersByTimeAsync(500);

      await user.keyboard('{ArrowLeft}');

      expect(defaultProps.onPrev).toHaveBeenCalledOnce();
    });

    it('does not call onPrev on ArrowLeft when first', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TourOverlay {...defaultProps} isFirst={true} />);
      await vi.advanceTimersByTimeAsync(500);

      await user.keyboard('{ArrowLeft}');

      expect(defaultProps.onPrev).not.toHaveBeenCalled();
    });

    it('calls onSkip on Enter when last step', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TourOverlay {...defaultProps} isLast={true} />);
      await vi.advanceTimersByTimeAsync(500);

      await user.keyboard('{Enter}');

      expect(defaultProps.onSkip).toHaveBeenCalledOnce();
    });
  });
});
