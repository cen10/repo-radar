import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingTour } from '@/components/OnboardingTour/OnboardingTour';

// Mock onboarding context
const mockOnboarding = {
  isTourActive: false,
  hasCompletedTour: false,
  completeTour: vi.fn(),
  startTour: vi.fn(),
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
  constructor(public options: Record<string, unknown>) {
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

    // Stars page has 6 steps (5 visible + 1 desktopOnly) on desktop
    const addedSteps = mockTourAddSteps.mock.calls[0][0];
    expect(addedSteps.length).toBe(6);
    expect(addedSteps[0].id).toBe('welcome');
    expect(addedSteps[1].id).toBe('repo-link');
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

  it('filters out desktopOnly steps on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    // Stars page: 6 steps on desktop, 5 on mobile (sidebar-radars removed)
    const addedSteps = mockTourAddSteps.mock.calls[0][0];
    expect(addedSteps.length).toBe(5);
    const ids = addedSteps.map((s: { id: string }) => s.id);
    expect(ids).not.toContain('sidebar-radars');
  });

  it('includes desktopOnly steps on desktop', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1280 });
    mockOnboarding.isTourActive = true;

    renderTour('/stars');

    const addedSteps = mockTourAddSteps.mock.calls[0][0];
    const ids = addedSteps.map((s: { id: string }) => s.id);
    expect(ids).toContain('sidebar-radars');
  });

  it('renders null (no DOM output)', () => {
    mockOnboarding.isTourActive = true;

    const { container } = renderTour('/stars');

    expect(container.innerHTML).toBe('');
  });
});
