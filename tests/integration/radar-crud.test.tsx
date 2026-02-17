import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import { renderForIntegration } from '../helpers/integration-render';
import { createMockRadar, createMockUser, createMockRepository } from '../mocks/factories';
import { CreateRadarModal } from '@/components/CreateRadarModal';
import { SidebarRadarList } from '@/components/SidebarRadarList';
import { ManageRadarsModal } from '@/components/ManageRadarsModal';
import type { RadarWithCount, Radar, RadarRepo } from '@/types/database';

// Mock the radar service at the module level
const mockGetRadars = vi.fn<() => Promise<RadarWithCount[]>>();
const mockCreateRadar = vi.fn<(name: string) => Promise<Radar>>();
const mockDeleteRadar = vi.fn<(radarId: string) => Promise<void>>();
const mockAddRepoToRadar = vi.fn<(radarId: string, githubRepoId: number) => Promise<RadarRepo>>();
const mockRemoveRepoFromRadar = vi.fn<(radarId: string, githubRepoId: number) => Promise<void>>();
const mockGetRadarsContainingRepo = vi.fn<(githubRepoId: number) => Promise<string[]>>();
const mockGetAllRadarRepoIds = vi.fn<() => Promise<Set<number>>>();

vi.mock('@/services/radar', () => ({
  getRadars: () => mockGetRadars(),
  createRadar: (name: string) => mockCreateRadar(name),
  deleteRadar: (id: string) => mockDeleteRadar(id),
  addRepoToRadar: (radarId: string, repoId: number) => mockAddRepoToRadar(radarId, repoId),
  removeRepoFromRadar: (radarId: string, repoId: number) =>
    mockRemoveRepoFromRadar(radarId, repoId),
  getRadarsContainingRepo: (repoId: number) => mockGetRadarsContainingRepo(repoId),
  getAllRadarRepoIds: () => mockGetAllRadarRepoIds(),
  RADAR_LIMITS: {
    MAX_RADARS_PER_USER: 5,
    MAX_REPOS_PER_RADAR: 25,
    MAX_TOTAL_REPOS: 50,
  },
}));

// Mock useSidebarContext since it's not exported from Sidebar.tsx
vi.mock('@/components/Sidebar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/components/Sidebar')>();
  return {
    ...actual,
    useSidebarContext: () => ({ collapsed: false, hideText: false }),
    SidebarTooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

describe('Radar CRUD Integration', () => {
  const mockUser = createMockUser({ login: 'testuser' });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRadars.mockResolvedValue([]);
    mockGetRadarsContainingRepo.mockResolvedValue([]);
    mockGetAllRadarRepoIds.mockResolvedValue(new Set());
  });

  describe('Create Radar Flow', () => {
    it('creates radar and invalidates radars query on success', async () => {
      const user = userEvent.setup();
      const newRadar = createMockRadar({ id: 'new-radar', name: 'My New Radar' });
      mockCreateRadar.mockResolvedValue(newRadar);

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      const { queryClient } = renderForIntegration(
        <CreateRadarModal onClose={onClose} onSuccess={onSuccess} />,
        { authState: { user: mockUser } }
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const input = screen.getByPlaceholderText(/machine learning/i);
      await user.type(input, 'My New Radar');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateRadar).toHaveBeenCalledWith('My New Radar');
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(newRadar);
        expect(onClose).toHaveBeenCalled();
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
    });

    it('shows error message when creation fails', async () => {
      const user = userEvent.setup();
      mockCreateRadar.mockRejectedValue(new Error('Radar name already exists'));

      const onClose = vi.fn();

      renderForIntegration(<CreateRadarModal onClose={onClose} />, {
        authState: { user: mockUser },
      });

      const input = screen.getByPlaceholderText(/machine learning/i);
      await user.type(input, 'Duplicate Name');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/radar name already exists/i);
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('prevents submission with empty name', async () => {
      const user = userEvent.setup();

      renderForIntegration(<CreateRadarModal onClose={vi.fn()} />, {
        authState: { user: mockUser },
      });

      const submitButton = screen.getByRole('button', { name: /create/i });
      expect(submitButton).toBeDisabled();

      const input = screen.getByPlaceholderText(/machine learning/i);
      await user.type(input, '   ');

      expect(submitButton).toBeDisabled();
      expect(mockCreateRadar).not.toHaveBeenCalled();
    });
  });

  describe('SidebarRadarList Integration', () => {
    it('displays radars from service', async () => {
      const radars = [
        createMockRadar({ id: '1', name: 'Frontend Tools', repo_count: 5 }),
        createMockRadar({ id: '2', name: 'Backend Libraries', repo_count: 3 }),
      ];
      mockGetRadars.mockResolvedValue(radars);

      renderForIntegration(<SidebarRadarList onLinkClick={vi.fn()} onCreateRadar={vi.fn()} />, {
        authState: { user: mockUser },
      });

      await waitFor(() => {
        expect(screen.getByText('Frontend Tools')).toBeInTheDocument();
        expect(screen.getByText('Backend Libraries')).toBeInTheDocument();
      });

      // Verify repo counts are displayed
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows empty state when no radars exist', async () => {
      mockGetRadars.mockResolvedValue([]);

      renderForIntegration(<SidebarRadarList onLinkClick={vi.fn()} onCreateRadar={vi.fn()} />, {
        authState: { user: mockUser },
      });

      await waitFor(() => {
        expect(screen.getByText(/no radars yet/i)).toBeInTheDocument();
      });
    });

    it('shows error state with retry button when loading fails', async () => {
      mockGetRadars.mockRejectedValue(new Error('Network error'));

      renderForIntegration(<SidebarRadarList onLinkClick={vi.fn()} onCreateRadar={vi.fn()} />, {
        authState: { user: mockUser },
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to load radars/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('disables create button when at radar limit', async () => {
      const radars = Array.from({ length: 5 }, (_, i) =>
        createMockRadar({ id: `radar-${i}`, name: `Radar ${i}`, repo_count: 1 })
      );
      mockGetRadars.mockResolvedValue(radars);

      renderForIntegration(<SidebarRadarList onLinkClick={vi.fn()} onCreateRadar={vi.fn()} />, {
        authState: { user: mockUser },
      });

      await waitFor(() => {
        expect(screen.getByText('Radar 0')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /new radar/i });
      expect(createButton).toBeDisabled();
    });
  });

  describe('Add/Remove Repo from Radar (Batch Save)', () => {
    const mockRepository = createMockRepository({ id: 123, name: 'test-repo' });

    it('updates checkbox state locally without API call on toggle', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 0 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());

      renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={vi.fn()} />,
        { authState: { user: mockUser } }
      );

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);

      // Checkbox should be checked immediately (local state)
      expect(checkbox).toBeChecked();

      // No API call yet - changes are batched until Done is clicked
      expect(mockAddRepoToRadar).not.toHaveBeenCalled();
    });

    it('saves changes and invalidates caches when Done is clicked', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 0 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());
      mockAddRepoToRadar.mockResolvedValue({
        id: 'radar-repo-1',
        radar_id: 'radar-1',
        github_repo_id: 123,
        added_at: new Date().toISOString(),
      });

      const onClose = vi.fn();
      const { queryClient } = renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={onClose} />,
        { authState: { user: mockUser } }
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });
      await user.click(checkbox);

      // API not called yet
      expect(mockAddRepoToRadar).not.toHaveBeenCalled();

      // Click Done to save
      const doneButton = screen.getByRole('button', { name: /done/i });
      await user.click(doneButton);

      // Now API should be called
      await waitFor(() => {
        expect(mockAddRepoToRadar).toHaveBeenCalledWith('radar-1', 123);
      });

      // Caches should be invalidated
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['repo-radars', 123],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['radarRepositories', 'radar-1'],
        });
      });

      // Modal should close
      expect(onClose).toHaveBeenCalled();
    });

    it('removes repo from radar when Done is clicked', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 1 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue(['radar-1']); // Repo is in radar
      mockGetAllRadarRepoIds.mockResolvedValue(new Set([123]));
      mockRemoveRepoFromRadar.mockResolvedValue(undefined);

      const onClose = vi.fn();
      const { queryClient } = renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={onClose} />,
        { authState: { user: mockUser } }
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });
      expect(checkbox).toBeChecked();

      await user.click(checkbox);

      // Should be unchecked now (unsaved removal)
      expect(checkbox).not.toBeChecked();
      expect(mockRemoveRepoFromRadar).not.toHaveBeenCalled();

      // Click Done to save
      const doneButton = screen.getByRole('button', { name: /done/i });
      await user.click(doneButton);

      await waitFor(() => {
        expect(mockRemoveRepoFromRadar).toHaveBeenCalledWith('radar-1', 123);
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['repo-radars', 123],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['radarRepositories', 'radar-1'],
        });
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('shows confirmation dialog when closing with unsaved changes', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 0 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());

      const onClose = vi.fn();

      renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={onClose} />,
        { authState: { user: mockUser } }
      );

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });
      await user.click(checkbox);

      // Click X button to try to close
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Should show confirmation dialog, not close immediately
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText(/discard changes/i)).toBeInTheDocument();

      // Confirm discard
      const discardButton = screen.getByRole('button', { name: /discard/i });
      await user.click(discardButton);

      // No API calls should be made
      expect(mockAddRepoToRadar).not.toHaveBeenCalled();
      expect(mockRemoveRepoFromRadar).not.toHaveBeenCalled();

      // Modal should close
      expect(onClose).toHaveBeenCalled();
    });

    it('keeps modal open when canceling discard confirmation', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 0 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());

      const onClose = vi.fn();

      renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={onClose} />,
        { authState: { user: mockUser } }
      );

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });
      await user.click(checkbox);

      // Click X button to try to close
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Cancel the discard (keep editing)
      const keepEditingButton = screen.getByRole('button', { name: /keep editing/i });
      await user.click(keepEditingButton);

      // Modal should still be open with changes preserved
      expect(onClose).not.toHaveBeenCalled();
      expect(checkbox).toBeChecked();
    });

    it('closes modal without API call when Done clicked with no changes', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 0 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());

      const onClose = vi.fn();

      renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={onClose} />,
        { authState: { user: mockUser } }
      );

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      // Click Done without making any changes
      const doneButton = screen.getByRole('button', { name: /done/i });
      await user.click(doneButton);

      // No API calls should be made
      expect(mockAddRepoToRadar).not.toHaveBeenCalled();
      expect(mockRemoveRepoFromRadar).not.toHaveBeenCalled();

      // Modal should close
      expect(onClose).toHaveBeenCalled();
    });

    it('shows error and keeps modal open when save fails', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 0 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());
      mockAddRepoToRadar.mockRejectedValue(new Error('Network error'));

      const onClose = vi.fn();

      renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={onClose} />,
        { authState: { user: mockUser } }
      );

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });
      await user.click(checkbox);

      const doneButton = screen.getByRole('button', { name: /done/i });
      await user.click(doneButton);

      // Error message should be shown
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
      });

      // Modal should NOT close
      expect(onClose).not.toHaveBeenCalled();
    });

    it('saves multiple changes in a single batch', async () => {
      const user = userEvent.setup();
      const radar1 = createMockRadar({ id: 'radar-1', name: 'Radar One', repo_count: 0 });
      const radar2 = createMockRadar({ id: 'radar-2', name: 'Radar Two', repo_count: 1 });

      mockGetRadars.mockResolvedValue([radar1, radar2]);
      mockGetRadarsContainingRepo.mockResolvedValue(['radar-2']); // Repo is in radar-2
      mockGetAllRadarRepoIds.mockResolvedValue(new Set([123]));
      mockAddRepoToRadar.mockResolvedValue({
        id: 'radar-repo-1',
        radar_id: 'radar-1',
        github_repo_id: 123,
        added_at: new Date().toISOString(),
      });
      mockRemoveRepoFromRadar.mockResolvedValue(undefined);

      const onClose = vi.fn();
      const { queryClient } = renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={onClose} />,
        { authState: { user: mockUser } }
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await waitFor(() => {
        expect(screen.getByText('Radar One')).toBeInTheDocument();
        expect(screen.getByText('Radar Two')).toBeInTheDocument();
      });

      // Add to radar-1
      const checkbox1 = screen.getByRole('checkbox', { name: /radar one/i });
      await user.click(checkbox1);
      expect(checkbox1).toBeChecked();

      // Remove from radar-2
      const checkbox2 = screen.getByRole('checkbox', { name: /radar two/i });
      await user.click(checkbox2);
      expect(checkbox2).not.toBeChecked();

      // No API calls yet
      expect(mockAddRepoToRadar).not.toHaveBeenCalled();
      expect(mockRemoveRepoFromRadar).not.toHaveBeenCalled();

      // Click Done to save all changes
      const doneButton = screen.getByRole('button', { name: /done/i });
      await user.click(doneButton);

      // Both API calls should be made
      await waitFor(() => {
        expect(mockAddRepoToRadar).toHaveBeenCalledWith('radar-1', 123);
        expect(mockRemoveRepoFromRadar).toHaveBeenCalledWith('radar-2', 123);
      });

      // Both radar caches should be invalidated
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['radarRepositories', 'radar-1'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['radarRepositories', 'radar-2'],
        });
      });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Radar Limits Enforcement', () => {
    const mockRepository = createMockRepository({ id: 456, name: 'another-repo' });

    it('disables checkbox when radar has max repos', async () => {
      const radar = createMockRadar({
        id: 'radar-1',
        name: 'Full Radar',
        repo_count: 25, // At per-radar limit
      });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());

      renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={vi.fn()} />,
        {
          authState: { user: mockUser },
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Full Radar')).toBeInTheDocument();
      });

      // Checkbox should be disabled due to per-radar limit
      const checkbox = screen.getByRole('checkbox', { name: /full radar/i });
      expect(checkbox).toBeDisabled();
    });

    it('disables checkbox when at total repo limit', async () => {
      // Multiple radars each under per-radar limit (25), but total reaches 50
      // This ensures we test the total limit, not the per-radar limit
      const radar1 = createMockRadar({
        id: 'radar-1',
        name: 'Radar A',
        repo_count: 24, // Under per-radar limit
      });
      const radar2 = createMockRadar({
        id: 'radar-2',
        name: 'Radar B',
        repo_count: 24, // Under per-radar limit
      });
      const radar3 = createMockRadar({
        id: 'radar-3',
        name: 'Has Room',
        repo_count: 2, // Has room, but total limit reached
      });
      // Total: 24 + 24 + 2 = 50 (at MAX_TOTAL_REPOS limit)

      mockGetRadars.mockResolvedValue([radar1, radar2, radar3]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());

      renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={vi.fn()} />,
        {
          authState: { user: mockUser },
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Has Room')).toBeInTheDocument();
      });

      // "Has Room" has only 2 repos (well under 25), but checkbox should be
      // disabled because total across all radars (50) is at the limit
      const checkbox = screen.getByRole('checkbox', { name: /has room/i });
      expect(checkbox).toBeDisabled();
    });

    it('respects unsaved changes when enforcing limits', async () => {
      const user = userEvent.setup();
      // Start at 49 total repos
      const radar1 = createMockRadar({
        id: 'radar-1',
        name: 'Radar A',
        repo_count: 24,
      });
      const radar2 = createMockRadar({
        id: 'radar-2',
        name: 'Radar B',
        repo_count: 24,
      });
      const radar3 = createMockRadar({
        id: 'radar-3',
        name: 'Almost Full',
        repo_count: 1, // 24 + 24 + 1 = 49
      });

      mockGetRadars.mockResolvedValue([radar1, radar2, radar3]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());

      renderForIntegration(<ManageRadarsModal githubRepoId={456} open={true} onClose={vi.fn()} />, {
        authState: { user: mockUser },
      });

      await waitFor(() => {
        expect(screen.getByText('Almost Full')).toBeInTheDocument();
      });

      // At 49 total, we can still add one more
      const checkboxAlmostFull = screen.getByRole('checkbox', { name: /almost full/i });
      expect(checkboxAlmostFull).not.toBeDisabled();

      // Add to "Almost Full" - this brings us to 50 (unsaved)
      await user.click(checkboxAlmostFull);
      expect(checkboxAlmostFull).toBeChecked();

      // Now Radar A should be disabled because unsaved total is 50
      const checkboxRadarA = screen.getByRole('checkbox', { name: /radar a/i });
      expect(checkboxRadarA).toBeDisabled();
    });
  });
});
