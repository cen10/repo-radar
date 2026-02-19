import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { RadarIconButton } from '@/components/RadarIconButton';
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
  createRadar: vi.fn(),
  RADAR_LIMITS: {
    MAX_RADARS_PER_USER: 5,
    MAX_REPOS_PER_RADAR: 25,
    MAX_TOTAL_REPOS: 50,
  },
}));

const TEST_REPO_ID = 12345;

const renderWithProviders = (ui: ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <OnboardingProvider>{ui}</OnboardingProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

// Helper to mock window.matchMedia for mobile/desktop testing
const mockMatchMedia = (isMobile: boolean) => {
  const query = '(max-width: 767px)';
  const mediaQueryList = {
    matches: isMobile,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    ...mediaQueryList,
    matches: q === query ? isMobile : false,
  }));

  return mediaQueryList;
};

describe('RadarIconButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(radarService.getRadars).mockResolvedValue([
      createMockRadar({ id: 'radar-1', name: 'Test Radar' }),
    ]);
    vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('responsive behavior', () => {
    it('shows bottom sheet on mobile when clicked', async () => {
      mockMatchMedia(true); // Mobile
      const user = userEvent.setup();

      renderWithProviders(<RadarIconButton githubRepoId={TEST_REPO_ID} />);

      // Click the radar icon
      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      // Wait for radars to load
      await waitFor(() => {
        expect(screen.getByText('Test Radar')).toBeInTheDocument();
      });

      // Should show bottom sheet (has the drag handle indicator)
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Bottom sheet has the drag handle div
      const dragHandle = dialog.querySelector('.bg-gray-300');
      expect(dragHandle).toBeInTheDocument();
    });

    it('shows modal on desktop when clicked', async () => {
      mockMatchMedia(false); // Desktop
      const user = userEvent.setup();

      renderWithProviders(<RadarIconButton githubRepoId={TEST_REPO_ID} />);

      // Click the radar icon
      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      // Wait for radars to load
      await waitFor(() => {
        expect(screen.getByText('Test Radar')).toBeInTheDocument();
      });

      // Should show modal (has X close button, no drag handle)
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Modal has X close button
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();

      // Modal should NOT have drag handle
      const dragHandle = dialog.querySelector('.bg-gray-300');
      expect(dragHandle).not.toBeInTheDocument();
    });

    it('only renders one dialog at a time', async () => {
      mockMatchMedia(true); // Mobile
      const user = userEvent.setup();

      renderWithProviders(<RadarIconButton githubRepoId={TEST_REPO_ID} />);

      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Radar')).toBeInTheDocument();
      });

      // Should only have one dialog
      const dialogs = screen.getAllByRole('dialog');
      expect(dialogs).toHaveLength(1);
    });

    it('modal stays open on desktop until explicitly closed', async () => {
      mockMatchMedia(false); // Desktop
      const user = userEvent.setup();

      renderWithProviders(<RadarIconButton githubRepoId={TEST_REPO_ID} />);

      // Open the modal
      await user.click(screen.getByRole('button', { name: /add to radar/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Dialog should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Radar')).toBeInTheDocument();

      // Close via Done button
      await user.click(screen.getByRole('button', { name: /done/i }));

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('icon button', () => {
    it('renders radar icon button', () => {
      mockMatchMedia(false);
      renderWithProviders(<RadarIconButton githubRepoId={TEST_REPO_ID} />);

      expect(screen.getByRole('button', { name: /add to radar/i })).toBeInTheDocument();
    });

    it('shows "Manage radars" label when repo is in a radar', async () => {
      mockMatchMedia(false);
      vi.mocked(radarService.getRadarsContainingRepo).mockResolvedValue(['radar-1']);

      renderWithProviders(<RadarIconButton githubRepoId={TEST_REPO_ID} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /manage radars for this repo/i })
        ).toBeInTheDocument();
      });
    });
  });
});
