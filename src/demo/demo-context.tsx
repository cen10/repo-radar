import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const DEMO_MODE_KEY = 'repo_radar_demo_mode';

interface DemoModeResult {
  success: boolean;
}

interface DemoContextType {
  isDemoMode: boolean;
  enterDemoMode: () => Promise<DemoModeResult>;
  exitDemoMode: () => void;
  isInitializing: boolean;
  isBannerVisible: boolean;
  dismissBanner: () => void;
  resetBannerDismissed: () => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

interface DemoModeProviderProps {
  children: ReactNode;
}

export function DemoModeProvider({ children }: DemoModeProviderProps) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  });
  const [isInitializing, setIsInitializing] = useState(false);
  // Block rendering until MSW starts (only matters in demo mode)
  const [canRender, setCanRender] = useState(!isDemoMode);
  // Track if banner is dismissed (resets on navigation, not persisted)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const isBannerVisible = isDemoMode && !isBannerDismissed;

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
  }, []);

  const resetBannerDismissed = useCallback(() => {
    setIsBannerDismissed(false);
  }, []);

  const enterDemoMode = useCallback(async (): Promise<DemoModeResult> => {
    if (isInitializing || isDemoMode) return { success: false };

    setIsInitializing(true);
    try {
      // Dynamically import and start MSW
      const { startDemoMode } = await import('./browser');
      await startDemoMode();

      localStorage.setItem(DEMO_MODE_KEY, 'true');
      setIsDemoMode(true);
      setCanRender(true);
      return { success: true };
    } catch {
      return { success: false };
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, isDemoMode]);

  const exitDemoMode = useCallback(() => {
    // Stop MSW (fire-and-forget since page reloads after)
    void import('./browser').then(({ stopDemoMode }) => stopDemoMode());

    localStorage.removeItem(DEMO_MODE_KEY);
    setIsDemoMode(false);
    setIsBannerDismissed(false);
  }, []);

  // If already in demo mode on mount, start MSW before rendering app
  useEffect(() => {
    if (isDemoMode && !canRender) {
      void import('./browser')
        .then(({ startDemoMode }) => startDemoMode())
        .then(() => setCanRender(true))
        .catch((err) => {
          console.error('Failed to start demo mode:', err);
          localStorage.removeItem(DEMO_MODE_KEY);
          setIsDemoMode(false);
          setCanRender(true);
        });
    }
  }, [isDemoMode, canRender]);

  // In demo mode, block rendering until MSW has started
  if (isDemoMode && !canRender) {
    return null;
  }

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        enterDemoMode,
        exitDemoMode,
        isInitializing,
        isBannerVisible,
        dismissBanner,
        resetBannerDismissed,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode(): DemoContextType {
  const context = useContext(DemoContext);
  if (!context) {
    // No provider = not in demo mode. Return safe defaults.
    // This is semantically correct and simplifies testing.
    if (process.env.NODE_ENV === 'development') {
      console.warn('useDemoMode: No DemoModeProvider found — demo mode will not function');
    }
    return {
      isDemoMode: false,
      enterDemoMode: async () => ({ success: false }),
      exitDemoMode: () => {},
      isInitializing: false,
      isBannerVisible: false,
      dismissBanner: () => {},
      resetBannerDismissed: () => {},
    };
  }
  return context;
}

/**
 * Check if demo mode is active by reading localStorage directly.
 *
 * Use this ONLY in non-React code (services, utilities, loaders) where
 * you don't have access to React context. In React components, use
 * the `useDemoMode()` hook instead for reactive updates.
 *
 * This reads localStorage which is updated synchronously before React
 * state in enterDemoMode/exitDemoMode, so it stays in sync.
 */
export function isDemoModeActive(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}
