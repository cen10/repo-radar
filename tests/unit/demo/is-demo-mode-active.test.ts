import { describe, it, expect, beforeEach } from 'vitest';
import { isDemoModeActive } from '@/demo/is-demo-mode-active';
import { DEMO_MODE_KEY } from '@/demo/DemoContext';

describe('isDemoModeActive', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when localStorage has no demo mode key', () => {
    expect(isDemoModeActive()).toBe(false);
  });

  it('returns true when localStorage has demo mode set to "true"', () => {
    localStorage.setItem(DEMO_MODE_KEY, 'true');

    expect(isDemoModeActive()).toBe(true);
  });

  it('returns false when localStorage has demo mode set to "false"', () => {
    localStorage.setItem(DEMO_MODE_KEY, 'false');

    expect(isDemoModeActive()).toBe(false);
  });

  it('returns false for any value other than "true"', () => {
    localStorage.setItem(DEMO_MODE_KEY, 'yes');
    expect(isDemoModeActive()).toBe(false);

    localStorage.setItem(DEMO_MODE_KEY, '1');
    expect(isDemoModeActive()).toBe(false);

    localStorage.setItem(DEMO_MODE_KEY, '');
    expect(isDemoModeActive()).toBe(false);
  });
});
