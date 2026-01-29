import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { RepoRadarSection } from './RepoRadarSection';
import * as radarService from '../../services/radar';
import { createTestQueryClient } from '../../test/helpers/query-client';
import { createMockRepository, createMockRadar } from '../../test/mocks/factories';

// Mock radar service
vi.mock('../../services/radar', () => ({
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

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const defaultRepo = createMockRepository();

describe('RepoRadarSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(radarService.getRadars).mockResolvedValue([]);
    vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
  });

  describe('when repository is not on any radar', () => {
    it('shows empty state message', () => {
      renderWithProviders(<RepoRadarSection repository={defaultRepo} radarIds={[]} />);

      expect(screen.getByText(/track this repository/i)).toBeInTheDocument();
      expect(screen.getByText(/add this repo to a radar/i)).toBeInTheDocument();
    });

    it('shows Add to Radar button', () => {
      renderWithProviders(<RepoRadarSection repository={defaultRepo} radarIds={[]} />);

      expect(screen.getByRole('button', { name: /add to radar/i })).toBeInTheDocument();
    });

    it('opens modal when Add to Radar is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.getRadars).mockResolvedValue([]);

      renderWithProviders(<RepoRadarSection repository={defaultRepo} radarIds={[]} />);

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('when repository is on radars', () => {
    const radars = [
      createMockRadar({ id: 'radar-1', name: 'My Radar' }),
      createMockRadar({ id: 'radar-2', name: 'Work Projects' }),
    ];

    beforeEach(() => {
      vi.mocked(radarService.getRadars).mockResolvedValue(radars);
    });

    it('shows radar count in heading', async () => {
      renderWithProviders(
        <RepoRadarSection repository={defaultRepo} radarIds={['radar-1', 'radar-2']} />
      );

      await waitFor(() => {
        expect(screen.getByText(/on 2 radars/i)).toBeInTheDocument();
      });
    });

    it('shows singular form for one radar', async () => {
      renderWithProviders(<RepoRadarSection repository={defaultRepo} radarIds={['radar-1']} />);

      await waitFor(() => {
        expect(screen.getByText(/on 1 radar$/i)).toBeInTheDocument();
      });
    });

    it('shows radar names as badges', async () => {
      renderWithProviders(
        <RepoRadarSection repository={defaultRepo} radarIds={['radar-1', 'radar-2']} />
      );

      await waitFor(() => {
        expect(screen.getByText('My Radar')).toBeInTheDocument();
        expect(screen.getByText('Work Projects')).toBeInTheDocument();
      });
    });

    it('shows Manage radars button', async () => {
      renderWithProviders(<RepoRadarSection repository={defaultRepo} radarIds={['radar-1']} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manage radars/i })).toBeInTheDocument();
      });
    });

    it('opens modal when Manage radars is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<RepoRadarSection repository={defaultRepo} radarIds={['radar-1']} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manage radars/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /manage radars/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});
