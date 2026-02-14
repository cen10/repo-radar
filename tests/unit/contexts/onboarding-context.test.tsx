import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { useOnboarding } from '@/contexts/use-onboarding';
import { DemoModeProvider } from '@/demo/demo-context';

const STORAGE_KEY = 'repo-radar-onboarding';

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
});
