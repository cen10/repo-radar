import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { OnboardingTour } from '@/components/OnboardingTour/OnboardingTour';
import { createTestQueryClient } from '../../../helpers/query-client';

// Mock demo mode
vi.mock('@/demo/use-demo-mode', () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ providerToken: 'test-token', user: { id: 'test-user' } }),
}));

// Mock useAllStarredRepositories
vi.mock('@/hooks/useAllStarredRepositories', () => ({
  useAllStarredRepositories: () => ({ totalStarred: 10, repositories: [], isLoading: false }),
}));

// Mock onboarding context
const mockOnboarding = {
  isTourActive: false,
  hasCompletedTour: false,
  currentStepId: null as string | null,
  completeTour: vi.fn(),
  startTour: vi.fn(),
  setCurrentStepId: vi.fn(),
  exitTour: vi.fn(),
  showExitConfirmation: false,
};

vi.mock('@/contexts/use-onboarding', () => ({
  useOnboarding: () => mockOnboarding,
}));

// Track Shepherd Tour instances
const mockTourStart = vi.fn();
const mockTourCancel = vi.fn();
const mockTourAddSteps = vi.fn();
const mockTourOn = vi.fn();
const mockTourOff = vi.fn();
const mockTourIsActive = vi.fn().mockReturnValue(false);
const mockTourBack = vi.fn();
const mockTourShow = vi.fn();
const mockTourGetCurrentStep = vi.fn();

const tourInstances: object[] = [];

class MockTour {
  start = mockTourStart;
  cancel = mockTourCancel;
  addSteps = mockTourAddSteps;
  on = mockTourOn;
  off = mockTourOff;
  isActive = mockTourIsActive;
  back = mockTourBack;
  show = mockTourShow;
  getCurrentStep = mockTourGetCurrentStep;
  options: Record<string, unknown>;
  constructor(options: Record<string, unknown>) {
    this.options = options;
    tourInstances.push(this);
  }
}

// Mock navigate for cross-page navigation tests
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-shepherd', () => ({
  useShepherd: () => ({ Tour: MockTour }),
}));

vi.mock('shepherd.js/dist/css/shepherd.css', () => ({}));

function renderTour(route = '/stars') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <OnboardingTour />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OnboardingTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tourInstances.length = 0;
    mockOnboarding.isTourActive = false;
    mockOnboarding.hasCompletedTour = false;
    mockOnboarding.showExitConfirmation = false;
    mockTourGetCurrentStep.mockReturnValue(null);
    sessionStorage.clear();

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1280,
    });
  });

  it('does not create a tour when inactive', () => {
    mockOnboarding.isTourActive = false;

    renderTour();

    expect(tourInstances).toHaveLength(0);
  });

  it('creates and starts a tour when active', () => {
    vi.useFakeTimers();
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    expect(tourInstances).toHaveLength(1);
    expect((tourInstances[0] as MockTour).options).toMatchObject({ useModalOverlay: true });
    expect(mockTourAddSteps).toHaveBeenCalledOnce();

    // Tour start is deferred to next tick for React Strict Mode compatibility
    vi.runAllTimers();
    expect(mockTourStart).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it('only includes steps for the current page', () => {
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    // Stars page has 4 steps on desktop when user has starred repos:
    // welcome, my-stars-heading, explore-link, sidebar-radars
    const addedSteps = mockTourAddSteps.mock.calls[0][0];
    expect(addedSteps.length).toBe(4);
    expect(addedSteps[0].id).toBe('welcome');
    expect(addedSteps[1].id).toBe('my-stars-heading');
    expect(addedSteps[2].id).toBe('explore-link');
    expect(addedSteps[3].id).toBe('sidebar-radars');
  });

  it('does not start tour when on a page with no steps', () => {
    mockOnboarding.isTourActive = true;

    renderTour('/explore');

    expect(tourInstances).toHaveLength(0);
  });

  it('registers complete event handler but not cancel (to allow resume on refresh)', () => {
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    expect(mockTourOn).toHaveBeenCalledWith('complete', expect.any(Function));
    // Cancel handler is NOT registered - we want the tour to resume on refresh,
    // and cancel fires during cleanup/unmount which would mark it as completed
    expect(mockTourOn).not.toHaveBeenCalledWith('cancel', expect.any(Function));
  });

  it('renders null (no DOM output)', () => {
    mockOnboarding.isTourActive = true;

    const { container } = renderTour('/stars');

    expect(container.innerHTML).toBe('');
  });

  it('registers keydown and click event listeners for tour cancellation', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    // Should register keydown listener for escape key
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    // Should register click listener for click-outside behavior
    expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);

    addEventListenerSpy.mockRestore();
  });

  it('removes event listeners on cleanup', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    mockOnboarding.isTourActive = true;

    const { unmount } = renderTour('/stars');
    unmount();

    // Should remove keydown and click listeners
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);

    removeEventListenerSpy.mockRestore();
  });

  describe('ArrowLeft keyboard navigation', () => {
    it('triggers cross-page navigation when step has backTo config', () => {
      mockOnboarding.isTourActive = true;
      // Simulate being on the radar-intro step (first step on radar page, has backTo)
      mockTourGetCurrentStep.mockReturnValue({ id: 'radar-intro' });

      renderTour('/radar/test-radar');

      // Dispatch ArrowLeft keydown event
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
      document.dispatchEvent(event);

      // Should navigate to the backTo path and set sessionStorage
      expect(mockNavigate).toHaveBeenCalledWith('/stars');
      expect(sessionStorage.getItem('tour-start-from-step')).toBe('sidebar-radars');
    });

    it('calls tour.show() with previous step index for same-page navigation', () => {
      mockOnboarding.isTourActive = true;
      // Simulate being on my-stars-heading step (second step on stars page, index 1)
      mockTourGetCurrentStep.mockReturnValue({ id: 'my-stars-heading' });

      renderTour('/stars');

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
      document.dispatchEvent(event);

      // Should call tour.show() with previous index and forward=false
      expect(mockTourShow).toHaveBeenCalledWith(0, false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does nothing on first step without backTo config', () => {
      mockOnboarding.isTourActive = true;
      // Simulate being on the welcome step (first step on stars page, no backTo)
      mockTourGetCurrentStep.mockReturnValue({ id: 'welcome' });

      renderTour('/stars');

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
      document.dispatchEvent(event);

      // Should not navigate or show any step
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockTourShow).not.toHaveBeenCalled();
    });
  });

  describe('Exit tour behavior', () => {
    it('calls exitTour when Escape key is pressed', () => {
      mockOnboarding.isTourActive = true;

      renderTour('/stars');

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(event);

      expect(mockOnboarding.exitTour).toHaveBeenCalledOnce();
      // Should NOT directly cancel the tour
      expect(mockTourCancel).not.toHaveBeenCalled();
    });

    it('calls exitTour when X button is clicked', () => {
      mockOnboarding.isTourActive = true;

      renderTour('/stars');

      // Create a mock cancel icon element
      const cancelIcon = document.createElement('button');
      cancelIcon.className = 'shepherd-cancel-icon';
      document.body.appendChild(cancelIcon);

      // Dispatch click event on the cancel icon
      const event = new MouseEvent('click', { bubbles: true });
      cancelIcon.dispatchEvent(event);

      expect(mockOnboarding.exitTour).toHaveBeenCalledOnce();

      // Cleanup
      document.body.removeChild(cancelIcon);
    });

    it('does not call exitTour when Escape is pressed while confirmation modal is showing', () => {
      mockOnboarding.isTourActive = true;
      mockOnboarding.showExitConfirmation = true;

      renderTour('/stars');

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(event);

      // Should NOT call exitTour - let HeadlessUI Dialog handle Escape
      expect(mockOnboarding.exitTour).not.toHaveBeenCalled();
    });
  });
});
