import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingProvider, useOnboarding } from '@/contexts/onboarding-context';
import { DemoModeProvider } from '@/demo/demo-context';

// Mock the browser module to avoid MSW setup
vi.mock('@/demo/browser', () => ({
  startDemoMode: vi.fn().mockResolvedValue(undefined),
  stopDemoMode: vi.fn().mockResolvedValue(undefined),
}));

const STORAGE_KEY = 'repo-radar-onboarding';

function TestConsumer() {
  const {
    hasCompletedTour,
    currentStep,
    isTourActive,
    startTour,
    nextStep,
    prevStep,
    completeTour,
    skipTour,
    setStep,
  } = useOnboarding();

  return (
    <div>
      <span data-testid="completed">{hasCompletedTour ? 'true' : 'false'}</span>
      <span data-testid="step">{currentStep}</span>
      <span data-testid="active">{isTourActive ? 'true' : 'false'}</span>
      <button onClick={startTour}>Start</button>
      <button onClick={nextStep}>Next</button>
      <button onClick={prevStep}>Prev</button>
      <button onClick={completeTour}>Complete</button>
      <button onClick={skipTour}>Skip</button>
      <button onClick={() => setStep(5)}>Jump to 5</button>
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
    expect(screen.getByTestId('step')).toHaveTextContent('0');
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('starts the tour', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /^start$/i }));

    expect(screen.getByTestId('active')).toHaveTextContent('true');
    expect(screen.getByTestId('step')).toHaveTextContent('0');
    expect(screen.getByTestId('completed')).toHaveTextContent('false');
  });

  it('advances steps with nextStep', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByTestId('step')).toHaveTextContent('1');
  });

  it('goes back with prevStep but not below 0', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^prev$/i }));

    expect(screen.getByTestId('step')).toHaveTextContent('0');

    // Going back from 0 stays at 0
    await user.click(screen.getByRole('button', { name: /^prev$/i }));
    expect(screen.getByTestId('step')).toHaveTextContent('0');
  });

  it('sets an arbitrary step', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await user.click(screen.getByRole('button', { name: /jump to 5/i }));

    expect(screen.getByTestId('step')).toHaveTextContent('5');
  });

  it('completeTour marks as completed and deactivates', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await user.click(screen.getByRole('button', { name: /^complete$/i }));

    expect(screen.getByTestId('completed')).toHaveTextContent('true');
    expect(screen.getByTestId('active')).toHaveTextContent('false');
    expect(screen.getByTestId('step')).toHaveTextContent('0');
  });

  it('skipTour marks as completed and deactivates', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await user.click(screen.getByRole('button', { name: /^skip$/i }));

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
    // Should not restore mid-tour state
    expect(screen.getByTestId('active')).toHaveTextContent('false');
    expect(screen.getByTestId('step')).toHaveTextContent('0');
  });

  it('ignores malformed localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');

    renderWithProvider();

    expect(screen.getByTestId('completed')).toHaveTextContent('false');
  });

  it('startTour resets to step 0 with fresh state', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    // Complete the tour first
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^complete$/i }));

    // Restart
    await user.click(screen.getByRole('button', { name: /^start$/i }));

    expect(screen.getByTestId('active')).toHaveTextContent('true');
    expect(screen.getByTestId('step')).toHaveTextContent('0');
    expect(screen.getByTestId('completed')).toHaveTextContent('false');
  });
});
