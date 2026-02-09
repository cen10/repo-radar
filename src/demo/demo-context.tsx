import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const DEMO_MODE_KEY = 'repo_radar_demo_mode';

interface DemoContextType {
  isDemoMode: boolean;
  enterDemoMode: () => Promise<void>;
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
  // Track if MSW is ready (for page reload in demo mode)
  const [isMswReady, setIsMswReady] = useState(() => {
    // If not in demo mode, MSW is "ready" (not needed)
    return localStorage.getItem(DEMO_MODE_KEY) !== 'true';
  });
  // Track if banner is dismissed (resets on navigation, not persisted)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const isBannerVisible = isDemoMode && !isBannerDismissed;

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
  }, []);

  const resetBannerDismissed = useCallback(() => {
    setIsBannerDismissed(false);
  }, []);

  const enterDemoMode = useCallback(async () => {
    setIsInitializing(true);
    try {
      // Dynamically import and start MSW
      const { startDemoMode } = await import('./browser');
      await startDemoMode();

      localStorage.setItem(DEMO_MODE_KEY, 'true');
      setIsDemoMode(true);
      setIsMswReady(true);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    // Stop MSW
    void import('./browser').then(({ stopDemoMode }) => {
      stopDemoMode();
    });

    localStorage.removeItem(DEMO_MODE_KEY);
    setIsDemoMode(false);
    setIsBannerDismissed(false);
  }, []);

  // If already in demo mode on mount, start MSW before rendering app
  useEffect(() => {
    if (isDemoMode && !isMswReady) {
      void import('./browser').then(({ startDemoMode }) => {
        void startDemoMode().then(() => {
          setIsMswReady(true);
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run only on mount
  }, []);

  // Block rendering until MSW is ready in demo mode
  if (isDemoMode && !isMswReady) {
    return null; // Or a loading spinner
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
    // Return safe defaults when used outside provider (e.g., in tests)
    // This allows components to check isDemoMode without requiring the full provider
    return {
      isDemoMode: false,
      enterDemoMode: async () => {},
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
 * Check if demo mode is active without requiring context.
 * Useful for service-level checks.
 */
export function isDemoModeActive(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}
