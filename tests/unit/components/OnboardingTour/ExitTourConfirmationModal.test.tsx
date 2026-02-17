import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExitTourConfirmationModal } from '@/components/OnboardingTour/ExitTourConfirmationModal';
import * as useOnboardingModule from '@/contexts/use-onboarding';

describe('ExitTourConfirmationModal', () => {
  const mockConfirmExitTour = vi.fn();
  const mockCancelExitTour = vi.fn();

  const mockUseOnboarding = (showExitConfirmation: boolean) => {
    vi.spyOn(useOnboardingModule, 'useOnboarding').mockReturnValue({
      hasCompletedTour: false,
      isTourActive: true,
      startTour: vi.fn(),
      restartTour: vi.fn(),
      completeTour: vi.fn(),
      currentStepId: null,
      setCurrentStepId: vi.fn(),
      showExitConfirmation,
      exitTour: vi.fn(),
      confirmExitTour: mockConfirmExitTour,
      cancelExitTour: mockCancelExitTour,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when showExitConfirmation is false', () => {
    mockUseOnboarding(false);
    const { container } = render(<ExitTourConfirmationModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal when showExitConfirmation is true', () => {
    mockUseOnboarding(true);
    render(<ExitTourConfirmationModal />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/exit tour\?/i)).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to exit/i)).toBeInTheDocument();
  });

  it('shows Continue Tour button', () => {
    mockUseOnboarding(true);
    render(<ExitTourConfirmationModal />);

    expect(screen.getByRole('button', { name: /continue tour/i })).toBeInTheDocument();
  });

  it('shows Exit Tour button', () => {
    mockUseOnboarding(true);
    render(<ExitTourConfirmationModal />);

    expect(screen.getByRole('button', { name: /exit tour/i })).toBeInTheDocument();
  });

  it('calls cancelExitTour when Continue Tour is clicked', async () => {
    mockUseOnboarding(true);
    const user = userEvent.setup();
    render(<ExitTourConfirmationModal />);

    await user.click(screen.getByRole('button', { name: /continue tour/i }));

    expect(mockCancelExitTour).toHaveBeenCalledTimes(1);
  });

  it('calls confirmExitTour when Exit Tour is clicked', async () => {
    mockUseOnboarding(true);
    const user = userEvent.setup();
    render(<ExitTourConfirmationModal />);

    await user.click(screen.getByRole('button', { name: /exit tour/i }));

    expect(mockConfirmExitTour).toHaveBeenCalledTimes(1);
  });

  it('mentions Help menu in the message', () => {
    mockUseOnboarding(true);
    render(<ExitTourConfirmationModal />);

    expect(screen.getByText(/help menu/i)).toBeInTheDocument();
  });

  it('focuses Exit Tour button initially', async () => {
    mockUseOnboarding(true);
    render(<ExitTourConfirmationModal />);

    const exitButton = screen.getByRole('button', { name: /exit tour/i });
    await waitFor(() => {
      expect(exitButton).toHaveFocus();
    });
  });

  it('calls cancelExitTour when Escape key is pressed', async () => {
    mockUseOnboarding(true);
    const user = userEvent.setup();
    render(<ExitTourConfirmationModal />);

    await user.keyboard('{Escape}');

    expect(mockCancelExitTour).toHaveBeenCalledTimes(1);
  });
});
