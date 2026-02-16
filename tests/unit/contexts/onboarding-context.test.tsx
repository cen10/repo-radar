import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { useOnboarding } from '@/contexts/use-onboarding';
import { DemoModeProvider } from '@/demo/demo-context';
import * as useDemoModeModule from '@/demo/use-demo-mode';

const STORAGE_KEY = 'repo-radar-onboarding';
const DEMO_SESSION_KEY = 'demo-onboarding';
const DEMO_MODE_KEY = 'repo_radar_demo_mode';

function TestConsumer() {
  const { hasCompletedTour, isTourActive, startTour, completeTour } = useOnboarding();

  return (
    <div>
      <span data-testid="completed">{hasCompletedTour ? 'true' : 'false'}</span>
      <span data-testid="active">{isTourActive ? 'true' : 'false'}</span>
      <button onClick={startTour}>Start</button>
      <button onClick={completeTour}>Complete</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <DemoModeProvider>
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    </DemoModeProvider>
  );
}

describe('OnboardingContext', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('throws when useOnboarding is used outside provider', () => {
    const consoleError = console.error;
    console.error = () => {};

    expect(() => render(<TestConsumer />)).toThrow(
      /useOnboarding must be used within an OnboardingProvider/i
    );

    console.error = consoleError;
  });

  it('starts with default state', () => {
    renderWithProvider();

    expect(screen.getByTestId('completed')).toHaveTextContent('false');
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('starts the tour', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /^start$/i }));

    expect(screen.getByTestId('active')).toHaveTextContent('true');
    expect(screen.getByTestId('completed')).toHaveTextContent('false');
  });

  it('completeTour marks as completed and deactivates', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await user.click(screen.getByRole('button', { name: /^complete$/i }));

    expect(screen.getByTestId('completed')).toHaveTextContent('true');
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('persists completion to localStorage', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await user.click(screen.getByRole('button', { name: /^complete$/i }));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.hasCompletedTour).toBe(true);
  });

  it('restores completion flag from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hasCompletedTour: true }));

    renderWithProvider();

    expect(screen.getByTestId('completed')).toHaveTextContent('true');
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('ignores malformed localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');

    renderWithProvider();

    expect(screen.getByTestId('completed')).toHaveTextContent('false');
  });

  it('startTour resets completed flag', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    // Complete the tour first
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await user.click(screen.getByRole('button', { name: /^complete$/i }));

    // Restart
    await user.click(screen.getByRole('button', { name: /^start$/i }));

    expect(screen.getByTestId('active')).toHaveTextContent('true');
    expect(screen.getByTestId('completed')).toHaveTextContent('false');
  });

  describe('Demo mode persistence', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function renderWithDemoMode() {
      vi.spyOn(useDemoModeModule, 'useDemoMode').mockReturnValue({
        isDemoMode: true,
        enterDemoMode: vi.fn().mockResolvedValue({ success: false }),
        exitDemoMode: vi.fn(),
        isInitializing: false,
        isBannerVisible: false,
        dismissBanner: vi.fn(),
        resetBannerDismissed: vi.fn(),
      });

      return render(
        <OnboardingProvider>
          <TestConsumer />
        </OnboardingProvider>
      );
    }

    it('persists completion to sessionStorage in demo mode', async () => {
      const user = userEvent.setup();
      renderWithDemoMode();

      await user.click(screen.getByRole('button', { name: /^start$/i }));
      await user.click(screen.getByRole('button', { name: /^complete$/i }));

      // Should be in sessionStorage, not localStorage
      const sessionStored = JSON.parse(sessionStorage.getItem(DEMO_SESSION_KEY)!);
      expect(sessionStored.hasCompletedTour).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('restores completion from sessionStorage in demo mode', () => {
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ hasCompletedTour: true }));

      renderWithDemoMode();

      expect(screen.getByTestId('completed')).toHaveTextContent('true');
    });

    it('does not show overlay after tour completed in demo mode (simulates refresh)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ hasCompletedTour: true }));

      renderWithDemoMode();

      // Overlay should NOT show because hasCompletedTour is true from sessionStorage
      expect(document.querySelector('.tour-fallback-overlay')).not.toBeInTheDocument();
    });

    it('does not write to localStorage when isDemoMode changes after tour completion', async () => {
      const user = userEvent.setup();

      // Start in demo mode
      const mockUseDemoMode = vi.spyOn(useDemoModeModule, 'useDemoMode');
      mockUseDemoMode.mockReturnValue({
        isDemoMode: true,
        enterDemoMode: vi.fn().mockResolvedValue({ success: false }),
        exitDemoMode: vi.fn(),
        isInitializing: false,
        isBannerVisible: false,
        dismissBanner: vi.fn(),
        resetBannerDismissed: vi.fn(),
      });

      const { rerender } = render(
        <OnboardingProvider>
          <TestConsumer />
        </OnboardingProvider>
      );

      // Complete the tour in demo mode
      await user.click(screen.getByRole('button', { name: /^start$/i }));
      await user.click(screen.getByRole('button', { name: /^complete$/i }));

      // Verify it wrote to sessionStorage, not localStorage
      expect(sessionStorage.getItem(DEMO_SESSION_KEY)).not.toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      // Simulate exiting demo mode (isDemoMode becomes false)
      mockUseDemoMode.mockReturnValue({
        isDemoMode: false,
        enterDemoMode: vi.fn().mockResolvedValue({ success: false }),
        exitDemoMode: vi.fn(),
        isInitializing: false,
        isBannerVisible: false,
        dismissBanner: vi.fn(),
        resetBannerDismissed: vi.fn(),
      });

      rerender(
        <OnboardingProvider>
          <TestConsumer />
        </OnboardingProvider>
      );

      // localStorage should STILL be empty - the bug was that it would write here
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('Fallback overlay', () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      vi.restoreAllMocks();
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        writable: true,
      });
    });

    it('shows overlay on desktop when tour is active', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByRole('button', { name: /^start$/i }));

      expect(document.querySelector('.tour-fallback-overlay')).toBeInTheDocument();
    });

    it('hides overlay on mobile when tour is active', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByRole('button', { name: /^start$/i }));

      expect(document.querySelector('.tour-fallback-overlay')).not.toBeInTheDocument();
    });

    it('hides overlay on mobile in demo mode', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      localStorage.setItem(DEMO_MODE_KEY, 'true');

      vi.spyOn(useDemoModeModule, 'useDemoMode').mockReturnValue({
        isDemoMode: true,
        enterDemoMode: vi.fn().mockResolvedValue({ success: false }),
        exitDemoMode: vi.fn(),
        isInitializing: false,
        isBannerVisible: false,
        dismissBanner: vi.fn(),
        resetBannerDismissed: vi.fn(),
      });

      render(
        <OnboardingProvider>
          <TestConsumer />
        </OnboardingProvider>
      );

      // In demo mode, hasCompletedTour=false, so condition would be true without isDesktop check
      expect(document.querySelector('.tour-fallback-overlay')).not.toBeInTheDocument();
    });

    it('shows overlay on desktop in demo mode', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      localStorage.setItem(DEMO_MODE_KEY, 'true');

      vi.spyOn(useDemoModeModule, 'useDemoMode').mockReturnValue({
        isDemoMode: true,
        enterDemoMode: vi.fn().mockResolvedValue({ success: false }),
        exitDemoMode: vi.fn(),
        isInitializing: false,
        isBannerVisible: false,
        dismissBanner: vi.fn(),
        resetBannerDismissed: vi.fn(),
      });

      render(
        <OnboardingProvider>
          <TestConsumer />
        </OnboardingProvider>
      );

      expect(document.querySelector('.tour-fallback-overlay')).toBeInTheDocument();
    });
  });
});
