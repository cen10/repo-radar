import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RadarDropdown } from './RadarDropdown';
import * as radarService from '../services/radar';
import type { RadarWithCount, Radar } from '../types/database';

// Mock the radar service
vi.mock('../services/radar', () => ({
  getRadars: vi.fn(),
  getRadarsContainingRepo: vi.fn(),
  addRepoToRadar: vi.fn(),
  removeRepoFromRadar: vi.fn(),
  createRadar: vi.fn(),
  RADAR_LIMITS: {
    MAX_RADARS_PER_USER: 5,
    MAX_REPOS_PER_RADAR: 25,
    MAX_TOTAL_REPOS: 50,
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const createMockRadar = (overrides?: Partial<RadarWithCount>): RadarWithCount => ({
  id: 'radar-1',
  user_id: 'user-1',
  name: 'Frontend',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  repo_count: 5,
  ...overrides,
});

const TEST_REPO_ID = 12345;

const renderWithProviders = (ui: React.ReactElement, queryClient?: QueryClient) => {
  const client = queryClient ?? createTestQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const TriggerButton = () => <button>Add to Radar</button>;

describe('RadarDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('opening and closing', () => {
    it('opens dropdown on trigger click', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      // Check for dropdown header (h3 element)
      expect(screen.getByRole('heading', { name: /add to radar/i })).toBeInTheDocument();
    });

    it('calls onOpenChange when dropdown opens', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(
        <RadarDropdown
          githubRepoId={TEST_REPO_ID}
          trigger={<TriggerButton />}
          onOpenChange={onOpenChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('radar list', () => {
    it('shows all radars with correct checked states', async () => {
      const user = userEvent.setup();
      const radars = [
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
        createMockRadar({ id: 'radar-2', name: 'Backend' }),
        createMockRadar({ id: 'radar-3', name: 'Tools' }),
      ];
      vi.mocked(radarService.getRadars).mockResolvedValue(radars);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1', 'radar-3']);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked(); // Frontend
      expect(checkboxes[1]).not.toBeChecked(); // Backend
      expect(checkboxes[2]).toBeChecked(); // Tools
    });

    it('shows "No radars yet" when empty', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByText(/no radars yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('checkbox toggling', () => {
    it('calls addRepoToRadar when checking unchecked radar', async () => {
      const user = userEvent.setup();
      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      vi.mocked(radarService.addRepoToRadar).mockResolvedValue({
        id: 'repo-1',
        radar_id: 'radar-1',
        github_repo_id: TEST_REPO_ID,
        created_at: '2024-01-15T10:00:00Z',
      });

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />,
        queryClient
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(radarService.addRepoToRadar).toHaveBeenCalledWith('radar-1', TEST_REPO_ID);
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['repo-radars', TEST_REPO_ID],
        });
      });
    });

    it('calls removeRepoFromRadar when unchecking checked radar', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1']);
      vi.mocked(radarService.removeRepoFromRadar).mockResolvedValue();

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeChecked();
      });

      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(radarService.removeRepoFromRadar).toHaveBeenCalledWith('radar-1', TEST_REPO_ID);
      });
    });

    it('announces add/remove via aria-live', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      vi.mocked(radarService.addRepoToRadar).mockResolvedValue({
        id: 'repo-1',
        radar_id: 'radar-1',
        github_repo_id: TEST_REPO_ID,
        created_at: '2024-01-15T10:00:00Z',
      });

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(screen.getByText(/added to frontend/i)).toBeInTheDocument();
      });
    });
  });

  describe('limit handling', () => {
    it('disables checkbox when radar at 25 repo limit', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Full Radar', repo_count: 25 }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeDisabled();
      });
    });

    it('disables all unchecked when at 50 total repo limit', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Checked', repo_count: 25 }),
        createMockRadar({ id: 'radar-2', name: 'Unchecked', repo_count: 25 }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1']);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        // Checked radar should be enabled (can uncheck)
        expect(checkboxes[0]).not.toBeDisabled();
        // Unchecked radar should be disabled (at limit)
        expect(checkboxes[1]).toBeDisabled();
      });
    });

    it('disables create button when at 5 radar limit', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Radar 1' }),
        createMockRadar({ id: 'radar-2', name: 'Radar 2' }),
        createMockRadar({ id: 'radar-3', name: 'Radar 3' }),
        createMockRadar({ id: 'radar-4', name: 'Radar 4' }),
        createMockRadar({ id: 'radar-5', name: 'Radar 5' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new radar/i });
        expect(createButton).toBeDisabled();
      });
    });
  });

  describe('inline radar creation', () => {
    it('shows "+ Create new radar" button by default', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new radar/i })).toBeInTheDocument();
      });
    });

    it('transforms to inline form on click', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new radar/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create new radar/i }));

      expect(screen.getByPlaceholderText(/new radar name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument();
    });

    it('create button is disabled when name is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));
      await user.click(screen.getByRole('button', { name: /create new radar/i }));

      expect(screen.getByRole('button', { name: /^create$/i })).toBeDisabled();
    });

    it('cancel button resets to button state', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));
      await user.click(screen.getByRole('button', { name: /create new radar/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.getByRole('button', { name: /create new radar/i })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/new radar name/i)).not.toBeInTheDocument();
    });

    it('successfully creates radar and auto-checks it', async () => {
      const user = userEvent.setup();
      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      const newRadar: Radar = {
        id: 'new-radar-id',
        user_id: 'user-1',
        name: 'My New Radar',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };
      vi.mocked(radarService.createRadar).mockResolvedValue(newRadar);
      vi.mocked(radarService.addRepoToRadar).mockResolvedValue({
        id: 'repo-1',
        radar_id: 'new-radar-id',
        github_repo_id: TEST_REPO_ID,
        created_at: '2024-01-15T10:00:00Z',
      });

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />,
        queryClient
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));
      await user.click(screen.getByRole('button', { name: /create new radar/i }));
      await user.type(screen.getByPlaceholderText(/new radar name/i), 'My New Radar');
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(radarService.createRadar).toHaveBeenCalledWith('My New Radar');
      });

      await waitFor(() => {
        expect(radarService.addRepoToRadar).toHaveBeenCalledWith('new-radar-id', TEST_REPO_ID);
      });

      // Verify caches invalidated
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['repo-radars', TEST_REPO_ID],
        });
      });

      // Form should reset
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new radar/i })).toBeInTheDocument();
      });

      // Success announced
      expect(screen.getByText(/radar 'my new radar' created and repo added/i)).toBeInTheDocument();
    });

    it('shows error on creation failure', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      vi.mocked(radarService.createRadar).mockRejectedValue(new Error('Radar name already exists'));

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));
      await user.click(screen.getByRole('button', { name: /create new radar/i }));
      await user.type(screen.getByPlaceholderText(/new radar name/i), 'Duplicate');
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/radar name already exists/i);
      });
    });

    it('shows spinner while submitting', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      // Make createRadar hang
      vi.mocked(radarService.createRadar).mockImplementation(() => new Promise(() => {}));

      renderWithProviders(
        <RadarDropdown githubRepoId={TEST_REPO_ID} trigger={<TriggerButton />} />
      );

      await user.click(screen.getByRole('button', { name: /add to radar/i }));
      await user.click(screen.getByRole('button', { name: /create new radar/i }));
      await user.type(screen.getByPlaceholderText(/new radar name/i), 'Test');

      const createButton = screen.getByRole('button', { name: /^create$/i });
      await user.click(createButton);

      // Button should show spinner (svg element) and be disabled
      await waitFor(() => {
        expect(createButton).toBeDisabled();
        expect(createButton.querySelector('svg.animate-spin')).toBeInTheDocument();
      });
    });
  });
});
