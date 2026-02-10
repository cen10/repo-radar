import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingTour } from '@/components/OnboardingTour/OnboardingTour';

// Mock the onboarding context
const mockOnboarding = {
  isTourActive: false,
  currentStep: 0,
  hasCompletedTour: false,
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  completeTour: vi.fn(),
  skipTour: vi.fn(),
  setStep: vi.fn(),
  startTour: vi.fn(),
};

vi.mock('@/contexts/onboarding-context', () => ({
  useOnboarding: () => mockOnboarding,
}));

// Mock TourOverlay to simplify testing the orchestrator logic
vi.mock('@/components/OnboardingTour/TourOverlay', () => ({
  TourOverlay: (props: {
    target: string;
    content: string;
    currentStep: number;
    totalSteps: number;
    isFirst: boolean;
    isLast: boolean;
  }) => (
    <div data-testid="tour-overlay">
      <span data-testid="overlay-target">{props.target}</span>
      <span data-testid="overlay-content">{props.content}</span>
      <span data-testid="overlay-step">{props.currentStep}</span>
      <span data-testid="overlay-total">{props.totalSteps}</span>
      <span data-testid="overlay-first">{String(props.isFirst)}</span>
      <span data-testid="overlay-last">{String(props.isLast)}</span>
    </div>
  ),
}));

function renderTour(route = '/stars') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <OnboardingTour hasStarredRepos={true} />
    </MemoryRouter>
  );
}

describe('OnboardingTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnboarding.isTourActive = false;
    mockOnboarding.currentStep = 0;
    mockOnboarding.hasCompletedTour = false;

    // Mock window.innerWidth for desktop by default
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1280,
    });
  });

  it('renders nothing when tour is not active', () => {
    mockOnboarding.isTourActive = false;

    const { container } = renderTour();

    expect(container.innerHTML).toBe('');
  });

  it('renders TourOverlay when tour is active', () => {
    mockOnboarding.isTourActive = true;
    mockOnboarding.currentStep = 0;

    renderTour();

    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument();
  });

  it('renders the first step (welcome) on /stars', () => {
    mockOnboarding.isTourActive = true;
    mockOnboarding.currentStep = 0;

    renderTour('/stars');

    // First step has empty target (centered welcome)
    expect(screen.getByTestId('overlay-target')).toHaveTextContent('');
    expect(screen.getByTestId('overlay-content')).toHaveTextContent(/welcome to repo radar/i);
  });

  it('renders nothing when on wrong page for current step', () => {
    mockOnboarding.isTourActive = true;
    mockOnboarding.currentStep = 0; // Step 0 is for 'stars' page

    const { container } = renderTour('/radar/some-id');

    expect(container.innerHTML).toBe('');
  });

  it('calls completeTour when step exceeds total steps', () => {
    mockOnboarding.isTourActive = true;
    mockOnboarding.currentStep = 999;

    renderTour();

    expect(mockOnboarding.completeTour).toHaveBeenCalledOnce();
  });

  it('marks the first step on current page as isFirst', () => {
    mockOnboarding.isTourActive = true;
    mockOnboarding.currentStep = 0;

    renderTour('/stars');

    expect(screen.getByTestId('overlay-first')).toHaveTextContent('true');
  });

  it('filters out desktopOnly steps on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });

    mockOnboarding.isTourActive = true;
    mockOnboarding.currentStep = 0;

    renderTour('/stars');

    // On mobile, sidebar step is filtered — totalSteps should be 11 not 12
    expect(screen.getByTestId('overlay-total')).toHaveTextContent('11');
  });

  it('includes desktopOnly steps on desktop', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1280 });

    mockOnboarding.isTourActive = true;
    mockOnboarding.currentStep = 0;

    renderTour('/stars');

    expect(screen.getByTestId('overlay-total')).toHaveTextContent('12');
  });

  it('shows the second step (repo-link) when currentStep is 1', () => {
    mockOnboarding.isTourActive = true;
    mockOnboarding.currentStep = 1;

    renderTour('/stars');

    expect(screen.getByTestId('overlay-target')).toHaveTextContent('[data-tour="repo-link"]');
    expect(screen.getByTestId('overlay-content')).toHaveTextContent(/click any repo name/i);
  });
});
