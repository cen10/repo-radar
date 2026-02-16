import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRadarToggle } from '@/hooks/useRadarToggle';
import { createQueryClientWrapper } from '../../helpers/render';
import { createMockRadar } from '../../mocks/factories';
import type { RadarWithCount } from '@/types/database';
import * as radarService from '@/services/radar';

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

  describe('saveChanges with partial failure', () => {
    it('removes succeeded operations from pending state on partial failure', async () => {
      const radar1 = createMockRadar({ id: 'radar-1', name: 'Frontend' });
      const radar2 = createMockRadar({ id: 'radar-2', name: 'Backend' });
      mockRadars.push(radar1, radar2);

      // radar-1 succeeds, radar-2 fails
      vi.mocked(radarService.addRepoToRadar).mockImplementation((radarId) => {
        if (radarId === 'radar-1') return Promise.resolve();
        return Promise.reject(new Error('Network error'));
      });

      const { result } = renderHook(
        () => useRadarToggle({ githubRepoId: testRepoId, open: true }),
        { wrapper }
      );

      // Toggle both radars on
      act(() => {
        result.current.handleToggleRadar(radar1);
        result.current.handleToggleRadar(radar2);
      });

      expect(result.current.isRadarChecked('radar-1')).toBe(true);
      expect(result.current.isRadarChecked('radar-2')).toBe(true);

      // Save - partial failure expected
      await act(async () => {
        try {
          await result.current.saveChanges();
        } catch {
          // Expected to throw
        }
      });

      // radar-1 succeeded, so it should be removed from pending
      // radar-2 failed, so it should still be pending
      await waitFor(() => {
        expect(result.current.saveError).toBe('Network error');
      });

      // The succeeded radar-1 should no longer be in pending state
      // Only radar-2 should remain as an unsaved change
      expect(result.current.hasUnsavedChanges).toBe(true);

      // On retry, only radar-2 should be attempted
      vi.mocked(radarService.addRepoToRadar).mockClear();
      vi.mocked(radarService.addRepoToRadar).mockResolvedValue();

      await act(async () => {
        await result.current.saveChanges();
      });

      // Should only have called addRepoToRadar for radar-2
      expect(radarService.addRepoToRadar).toHaveBeenCalledTimes(1);
      expect(radarService.addRepoToRadar).toHaveBeenCalledWith('radar-2', testRepoId);
    });

    it('clears all pending state when all operations succeed', async () => {
      const radar1 = createMockRadar({ id: 'radar-1', name: 'Frontend' });
      const radar2 = createMockRadar({ id: 'radar-2', name: 'Backend' });
      mockRadars.push(radar1, radar2);

      vi.mocked(radarService.addRepoToRadar).mockResolvedValue();

      const { result } = renderHook(
        () => useRadarToggle({ githubRepoId: testRepoId, open: true }),
        { wrapper }
      );

      act(() => {
        result.current.handleToggleRadar(radar1);
        result.current.handleToggleRadar(radar2);
      });

      await act(async () => {
        await result.current.saveChanges();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.saveError).toBeNull();
    });
  });
});
