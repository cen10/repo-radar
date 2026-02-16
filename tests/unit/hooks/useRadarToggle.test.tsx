import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useRadarToggle } from '@/hooks/useRadarToggle';
import { createQueryClientWrapper } from '../../helpers/render';
import { createMockRadar } from '../../mocks/factories';
import type { RadarWithCount } from '@/types/database';

// Mock the dependent hooks
const mockRadars: RadarWithCount[] = [];
const mockRadarsAlreadyContainingRepo: string[] = [];

vi.mock('@/hooks/useRadars', () => ({
  useRadars: () => ({
    radars: mockRadars,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useRepoRadars', () => ({
  useRepoRadars: () => ({
    radarsAlreadyContainingRepo: mockRadarsAlreadyContainingRepo,
    isLoading: false,
    error: null,
  }),
}));

// Mock the radar service
vi.mock('@/services/radar', () => ({
  addRepoToRadar: vi.fn(),
  removeRepoFromRadar: vi.fn(),
  RADAR_LIMITS: {
    MAX_RADARS: 10,
    MAX_REPOS_PER_RADAR: 50,
    MAX_TOTAL_REPOS: 200,
  },
}));

describe('useRadarToggle', () => {
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;
  const testRepoId = 12345;

  beforeEach(() => {
    const result = createQueryClientWrapper();
    wrapper = result.wrapper;
    vi.clearAllMocks();
    // Reset mock data
    mockRadars.length = 0;
    mockRadarsAlreadyContainingRepo.length = 0;
  });

  describe('hasUnsavedChanges', () => {
    it('is false initially when dialog opens', () => {
      mockRadars.push(createMockRadar({ id: 'radar-1', name: 'Frontend' }));

      const { result } = renderHook(
        () => useRadarToggle({ githubRepoId: testRepoId, open: true }),
        {
          wrapper,
        }
      );

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('is true after toggling a radar on', () => {
      const radar = createMockRadar({ id: 'radar-1', name: 'Frontend' });
      mockRadars.push(radar);

      const { result } = renderHook(
        () => useRadarToggle({ githubRepoId: testRepoId, open: true }),
        {
          wrapper,
        }
      );

      act(() => {
        result.current.handleToggleRadar(radar);
      });

      expect(result.current.isRadarChecked('radar-1')).toBe(true);
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('is false after toggling a radar on then off (back to original state)', () => {
      // Repo is NOT in radar-1 initially
      const radar = createMockRadar({ id: 'radar-1', name: 'Frontend' });
      mockRadars.push(radar);

      const { result } = renderHook(
        () => useRadarToggle({ githubRepoId: testRepoId, open: true }),
        {
          wrapper,
        }
      );

      // Toggle on
      act(() => {
        result.current.handleToggleRadar(radar);
      });
      expect(result.current.isRadarChecked('radar-1')).toBe(true);
      expect(result.current.hasUnsavedChanges).toBe(true);

      // Toggle off (back to original state)
      act(() => {
        result.current.handleToggleRadar(radar);
      });
      expect(result.current.isRadarChecked('radar-1')).toBe(false);

      // BUG: hasUnsavedChanges should be false, but current implementation
      // leaves stale entry in radarsToRemoveRepoFrom
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('is false after toggling a radar off then on (back to original state)', () => {
      // Repo IS in radar-1 initially
      const radar = createMockRadar({ id: 'radar-1', name: 'Frontend' });
      mockRadars.push(radar);
      mockRadarsAlreadyContainingRepo.push('radar-1');

      const { result } = renderHook(
        () => useRadarToggle({ githubRepoId: testRepoId, open: true }),
        {
          wrapper,
        }
      );

      // Initially checked
      expect(result.current.isRadarChecked('radar-1')).toBe(true);

      // Toggle off
      act(() => {
        result.current.handleToggleRadar(radar);
      });
      expect(result.current.isRadarChecked('radar-1')).toBe(false);
      expect(result.current.hasUnsavedChanges).toBe(true);

      // Toggle on (back to original state)
      act(() => {
        result.current.handleToggleRadar(radar);
      });
      expect(result.current.isRadarChecked('radar-1')).toBe(true);

      // BUG: hasUnsavedChanges should be false, but current implementation
      // leaves stale entry in radarsToAddRepoTo
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });
});
