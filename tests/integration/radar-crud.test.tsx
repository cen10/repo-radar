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

// Provide SidebarContext for SidebarRadarList
const SidebarContextProvider = ({ children }: { children: ReactNode }) => {
  // Using a simple wrapper that provides the context value inline
  // The actual context is internal to Sidebar.tsx, so we mock the hook instead
  return <>{children}</>;
};

// Mock useSidebarContext since it's not exported
vi.mock('@/components/Sidebar', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/components/Sidebar')>();
  return {
    ...original,
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
    it('creates radar and invalidates cache on success', async () => {
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

      // Fill in the form
      const input = screen.getByPlaceholderText(/machine learning/i);
      await user.type(input, 'My New Radar');

      // Submit
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Wait for success
      await waitFor(() => {
        expect(mockCreateRadar).toHaveBeenCalledWith('My New Radar');
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(newRadar);
        expect(onClose).toHaveBeenCalled();
      });

      // Verify cache invalidation
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
    });

    it('shows error message when creation fails', async () => {
      const user = userEvent.setup();
      mockCreateRadar.mockRejectedValue(new Error('Radar name already exists'));

      const onClose = vi.fn();

      renderForIntegration(<CreateRadarModal onClose={onClose} />, {
        authState: { user: mockUser },
      });

      // Fill and submit
      const input = screen.getByPlaceholderText(/machine learning/i);
      await user.type(input, 'Duplicate Name');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/radar name already exists/i);
      });

      // Modal should stay open
      expect(onClose).not.toHaveBeenCalled();
    });

    it('prevents submission with empty name', async () => {
      const user = userEvent.setup();

      renderForIntegration(<CreateRadarModal onClose={vi.fn()} />, {
        authState: { user: mockUser },
      });

      // Try to submit with empty input
      const submitButton = screen.getByRole('button', { name: /create/i });
      expect(submitButton).toBeDisabled();

      // Type whitespace only
      const input = screen.getByPlaceholderText(/machine learning/i);
      await user.type(input, '   ');

      // Still disabled
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

      renderForIntegration(
        <SidebarContextProvider>
          <SidebarRadarList onLinkClick={vi.fn()} onCreateRadar={vi.fn()} />
        </SidebarContextProvider>,
        { authState: { user: mockUser } }
      );

      // Wait for radars to load
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

      renderForIntegration(
        <SidebarContextProvider>
          <SidebarRadarList onLinkClick={vi.fn()} onCreateRadar={vi.fn()} />
        </SidebarContextProvider>,
        { authState: { user: mockUser } }
      );

      await waitFor(() => {
        expect(screen.getByText(/no radars yet/i)).toBeInTheDocument();
      });
    });

    it('shows error state with retry button when loading fails', async () => {
      mockGetRadars.mockRejectedValue(new Error('Network error'));

      renderForIntegration(
        <SidebarContextProvider>
          <SidebarRadarList onLinkClick={vi.fn()} onCreateRadar={vi.fn()} />
        </SidebarContextProvider>,
        { authState: { user: mockUser } }
      );

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

      renderForIntegration(
        <SidebarContextProvider>
          <SidebarRadarList onLinkClick={vi.fn()} onCreateRadar={vi.fn()} />
        </SidebarContextProvider>,
        { authState: { user: mockUser } }
      );

      await waitFor(() => {
        expect(screen.getByText('Radar 0')).toBeInTheDocument();
      });

      // Create button should be disabled
      const createButton = screen.getByRole('button', { name: /new radar/i });
      expect(createButton).toBeDisabled();
    });
  });

  describe('Add/Remove Repo from Radar', () => {
    const mockRepository = createMockRepository({ id: 123, name: 'test-repo' });

    it('adds repo to radar and invalidates cache', async () => {
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

      const { queryClient } = renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={vi.fn()} />,
        { authState: { user: mockUser } }
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Wait for radars to load
      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      // Click checkbox to add repo
      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);

      // Verify service was called
      await waitFor(() => {
        expect(mockAddRepoToRadar).toHaveBeenCalledWith('radar-1', 123);
      });

      // Verify cache invalidation
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['repo-radars', 123],
        });
      });
    });

    it('removes repo from radar and invalidates cache', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 1 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue(['radar-1']); // Repo is in radar
      mockGetAllRadarRepoIds.mockResolvedValue(new Set([123]));
      mockRemoveRepoFromRadar.mockResolvedValue(undefined);

      const { queryClient } = renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={vi.fn()} />,
        { authState: { user: mockUser } }
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Wait for radars to load
      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      // Checkbox should be checked
      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });
      expect(checkbox).toBeChecked();

      // Click to remove
      await user.click(checkbox);

      // Verify service was called
      await waitFor(() => {
        expect(mockRemoveRepoFromRadar).toHaveBeenCalledWith('radar-1', 123);
      });

      // Verify cache invalidation
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
      });
    });

    it('shows optimistic update immediately', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 0 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());

      // Delay the service response to test optimistic update
      mockAddRepoToRadar.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  id: 'radar-repo-1',
                  radar_id: 'radar-1',
                  github_repo_id: 123,
                  added_at: new Date().toISOString(),
                }),
              100
            )
          )
      );

      renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={vi.fn()} />,
        {
          authState: { user: mockUser },
        }
      );

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });
      expect(checkbox).not.toBeChecked();

      // Click to add
      await user.click(checkbox);

      // Checkbox should be checked immediately (optimistic update)
      expect(checkbox).toBeChecked();
    });

    it('reverts optimistic update on error', async () => {
      const user = userEvent.setup();
      const radar = createMockRadar({ id: 'radar-1', name: 'My Radar', repo_count: 0 });

      mockGetRadars.mockResolvedValue([radar]);
      mockGetRadarsContainingRepo.mockResolvedValue([]);
      mockGetAllRadarRepoIds.mockResolvedValue(new Set());
      mockAddRepoToRadar.mockRejectedValue(new Error('Failed to add'));

      renderForIntegration(
        <ManageRadarsModal githubRepoId={mockRepository.id} open={true} onClose={vi.fn()} />,
        {
          authState: { user: mockUser },
        }
      );

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /my radar/i });

      // Click to add
      await user.click(checkbox);

      // Wait for error and revert
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });

      // Error message should be shown
      expect(screen.getByRole('alert')).toBeInTheDocument();
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
      // Create a radar with room, but user is at total limit (50 repos)
      const radar = createMockRadar({
        id: 'radar-1',
        name: 'Has Room',
        repo_count: 50, // All 50 repos are in this radar
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
        expect(screen.getByText('Has Room')).toBeInTheDocument();
      });

      // Checkbox should be disabled due to total repo limit
      const checkbox = screen.getByRole('checkbox', { name: /has room/i });
      expect(checkbox).toBeDisabled();
    });
  });
});
