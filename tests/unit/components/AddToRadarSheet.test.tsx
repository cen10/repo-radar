import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddToRadarSheet } from '@/components/AddToRadarSheet';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import * as radarService from '@/services/radar';
import { createTestQueryClient } from '../../helpers/query-client';
import { createMockRadar } from '../../mocks/factories';

// Mock the radar service
vi.mock('@/services/radar', () => ({
  getRadars: vi.fn(),
  getRadarsContainingRepo: vi.fn(),
  addRepoToRadar: vi.fn(),
  removeRepoFromRadar: vi.fn(),
  RADAR_LIMITS: {
    MAX_RADARS_PER_USER: 5,
    MAX_REPOS_PER_RADAR: 25,
    MAX_TOTAL_REPOS: 50,
  },
}));

const TEST_REPO_ID = 12345;

const defaultProps = {
  githubRepoId: TEST_REPO_ID,
  open: true,
  onClose: vi.fn(),
};

const renderWithProviders = (ui: ReactElement, queryClient?: QueryClient) => {
  const client = queryClient ?? createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <OnboardingProvider>{ui}</OnboardingProvider>
    </QueryClientProvider>
  );
};

describe('AddToRadarSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders bottom sheet with title', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add to radar/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('radar list', () => {
    it('shows all radars with correct checked states', async () => {
      const radars = [
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
        createMockRadar({ id: 'radar-2', name: 'Backend' }),
        createMockRadar({ id: 'radar-3', name: 'Tools' }),
      ];
      vi.mocked(radarService.getRadars).mockResolvedValue(radars);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1', 'radar-3']);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked(); // Frontend
      expect(checkboxes[1]).not.toBeChecked(); // Backend
      expect(checkboxes[2]).toBeChecked(); // Tools
    });

    it('shows empty message when no radars', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/no radars yet/i)).toBeInTheDocument();
      });
    });

    it('shows loading state', () => {
      vi.mocked(radarService.getRadars).mockImplementation(() => new Promise(() => {}));
      vi.mocked(radarService.getRadarsContainingRepo).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
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
        added_at: '2024-01-15T10:00:00Z',
      });

      renderWithProviders(<AddToRadarSheet {...defaultProps} />, queryClient);

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

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeChecked();
      });

      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(radarService.removeRepoFromRadar).toHaveBeenCalledWith('radar-1', TEST_REPO_ID);
      });
    });

    it('shows optimistic update immediately', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
      vi.mocked(radarService.addRepoToRadar).mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });

      await user.click(screen.getByRole('checkbox'));

      // Should be checked immediately (optimistic)
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('reverts optimistic update on error', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Frontend' }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      let rejectFn: (err: Error) => void;
      vi.mocked(radarService.addRepoToRadar).mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectFn = reject;
          })
      );

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });

      await user.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).toBeChecked();

      rejectFn!(new Error('Failed to add'));

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).not.toBeChecked();
      });

      expect(screen.getByRole('alert')).toHaveTextContent(/failed to add/i);
    });
  });

  describe('limit handling', () => {
    it('disables checkbox when radar at 25 repo limit', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Full Radar', repo_count: 25 }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeDisabled();
      });
    });

    it('disables all unchecked when at 50 total repo limit', async () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([
        createMockRadar({ id: 'radar-1', name: 'Checked', repo_count: 25 }),
        createMockRadar({ id: 'radar-2', name: 'Unchecked', repo_count: 25 }),
      ]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1']);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        // Checked radar should be enabled (can uncheck)
        expect(checkboxes[0]).not.toBeDisabled();
        // Unchecked radar should be disabled (at limit)
        expect(checkboxes[1]).toBeDisabled();
      });
    });
  });

  describe('closing behavior', () => {
    it('calls onClose when Done button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /done/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has accessible dialog role', () => {
      vi.mocked(radarService.getRadars).mockResolvedValue([]);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);

      renderWithProviders(<AddToRadarSheet {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
