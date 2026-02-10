import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoModeProvider, useDemoMode } from '@/demo/demo-context';

// Mock the browser module to avoid MSW setup in tests
vi.mock('@/demo/browser', () => ({
  startDemoMode: vi.fn().mockResolvedValue(undefined),
  stopDemoMode: vi.fn().mockResolvedValue(undefined),
}));

// Test component that uses the hook
function TestConsumer() {
  const { isDemoMode, enterDemoMode, isInitializing } = useDemoMode();
  return (
    <div>
      <span data-testid="is-demo-mode">{isDemoMode ? 'true' : 'false'}</span>
      <span data-testid="is-initializing">{isInitializing ? 'true' : 'false'}</span>
      <button onClick={() => void enterDemoMode()}>Enter Demo</button>
    </div>
  );
}

describe('useDemoMode', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  describe('when provider is missing', () => {
    it('logs a warning in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(<TestConsumer />);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'useDemoMode: No DemoModeProvider found — demo mode will not function'
      );
    });

    it('does not log a warning in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(<TestConsumer />);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('returns isDemoMode as false', () => {
      render(<TestConsumer />);

      expect(screen.getByTestId('is-demo-mode')).toHaveTextContent('false');
    });

    it('enterDemoMode returns { success: false }', async () => {
      let result: { success: boolean } | undefined;
      function TestComponent() {
        const { enterDemoMode } = useDemoMode();
        return (
          <button
            onClick={async () => {
              result = await enterDemoMode();
            }}
          >
            Enter
          </button>
        );
      }

      const user = userEvent.setup();
      render(<TestComponent />);

      await user.click(screen.getByRole('button', { name: /enter/i }));

      expect(result).toEqual({ success: false });
    });
  });

  describe('when provider is present', () => {
    it('enterDemoMode returns { success: true } on success', async () => {
      let result: { success: boolean } | undefined;
      function TestComponent() {
        const { enterDemoMode } = useDemoMode();
        return (
          <button
            onClick={async () => {
              result = await enterDemoMode();
            }}
          >
            Enter
          </button>
        );
      }

      const user = userEvent.setup();
      render(
        <DemoModeProvider>
          <TestComponent />
        </DemoModeProvider>
      );

      await user.click(screen.getByRole('button', { name: /enter/i }));

      await waitFor(() => {
        expect(result).toEqual({ success: true });
      });
    });

    it('sets isDemoMode to true after successful enterDemoMode', async () => {
      const user = userEvent.setup();
      render(
        <DemoModeProvider>
          <TestConsumer />
        </DemoModeProvider>
      );

      expect(screen.getByTestId('is-demo-mode')).toHaveTextContent('false');

      await user.click(screen.getByRole('button', { name: /enter demo/i }));

      await waitFor(() => {
        expect(screen.getByTestId('is-demo-mode')).toHaveTextContent('true');
      });
    });

    it('enterDemoMode returns { success: false } when MSW fails to start', async () => {
      const { startDemoMode } = await import('@/demo/browser');
      vi.mocked(startDemoMode).mockRejectedValueOnce(new Error('MSW failed'));

      let result: { success: boolean } | undefined;
      function TestComponent() {
        const { enterDemoMode } = useDemoMode();
        return (
          <button
            onClick={async () => {
              result = await enterDemoMode();
            }}
          >
            Enter
          </button>
        );
      }

      const user = userEvent.setup();
      render(
        <DemoModeProvider>
          <TestComponent />
        </DemoModeProvider>
      );

      await user.click(screen.getByRole('button', { name: /enter/i }));

      await waitFor(() => {
        expect(result).toEqual({ success: false });
      });
    });
  });
});
