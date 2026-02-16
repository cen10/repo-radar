import { createContext } from 'react';

export const DEMO_MODE_KEY = 'repo_radar_demo_mode';

interface DemoModeResult {
  success: boolean;
}

export interface DemoContextType {
  isDemoMode: boolean;
  enterDemoMode: () => Promise<DemoModeResult>;
  exitDemoMode: () => void;
  isInitializing: boolean;
  isBannerVisible: boolean;
  dismissBanner: () => void;
  resetBannerDismissed: () => void;
}

export const DemoContext = createContext<DemoContextType | null>(null);
