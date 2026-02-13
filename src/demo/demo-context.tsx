import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { DemoContext, DEMO_MODE_KEY } from './DemoContext';

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

  const dismissBanner = () => {
    setIsBannerDismissed(true);
  };

  const resetBannerDismissed = useCallback(() => {
    setIsBannerDismissed(false);
  }, []);

  const enterDemoMode = async () => {
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
  };

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
    <DemoContext
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
    </DemoContext>
  );
}
