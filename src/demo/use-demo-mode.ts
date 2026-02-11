import { useContext } from 'react';
import { DemoContext, type DemoContextType } from './DemoContext';

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
