import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingTour } from '@/components/OnboardingTour/OnboardingTour';

// Mock onboarding context
const mockOnboarding = {
  isTourActive: false,
  hasCompletedTour: false,
  currentStepId: null as string | null,
  completeTour: vi.fn(),
  startTour: vi.fn(),
  setCurrentStepId: vi.fn(),
};

vi.mock('@/contexts/onboarding-context', () => ({
  useOnboarding: () => mockOnboarding,
}));

// Track Shepherd Tour instances
const mockTourStart = vi.fn();
const mockTourCancel = vi.fn();
const mockTourAddSteps = vi.fn();
const mockTourOn = vi.fn();
const mockTourOff = vi.fn();
const mockTourIsActive = vi.fn().mockReturnValue(false);

const tourInstances: object[] = [];

class MockTour {
  start = mockTourStart;
  cancel = mockTourCancel;
  addSteps = mockTourAddSteps;
  on = mockTourOn;
  off = mockTourOff;
  isActive = mockTourIsActive;
  options: Record<string, unknown>;
  constructor(options: Record<string, unknown>) {
    this.options = options;
    tourInstances.push(this);
  }
}

vi.mock('react-shepherd', () => ({
  useShepherd: () => ({ Tour: MockTour }),
}));

vi.mock('shepherd.js/dist/css/shepherd.css', () => ({}));

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
    tourInstances.length = 0;
    mockOnboarding.isTourActive = false;
    mockOnboarding.hasCompletedTour = false;

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
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    expect(tourInstances).toHaveLength(1);
    expect((tourInstances[0] as MockTour).options).toMatchObject({ useModalOverlay: true });
    expect(mockTourAddSteps).toHaveBeenCalledOnce();
    expect(mockTourStart).toHaveBeenCalledOnce();
  });

  it('only includes steps for the current page', () => {
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    // Stars page has 4 steps on desktop when user has starred repos:
    // welcome, help-button, repo-link, sidebar-radars
    const addedSteps = mockTourAddSteps.mock.calls[0][0];
    expect(addedSteps.length).toBe(4);
    expect(addedSteps[0].id).toBe('welcome');
    expect(addedSteps[1].id).toBe('help-button');
    expect(addedSteps[2].id).toBe('repo-link');
    expect(addedSteps[3].id).toBe('sidebar-radars');
  });

  it('does not start tour when on a page with no steps', () => {
    mockOnboarding.isTourActive = true;

    renderTour('/explore');

    expect(tourInstances).toHaveLength(0);
  });

  it('registers complete and cancel event handlers', () => {
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    expect(mockTourOn).toHaveBeenCalledWith('complete', expect.any(Function));
    expect(mockTourOn).toHaveBeenCalledWith('cancel', expect.any(Function));
  });

  it('does not create tour on mobile (tour is desktop-only)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    // On mobile, no tour is created because stepDefs returns empty array
    expect(tourInstances).toHaveLength(0);
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
});
