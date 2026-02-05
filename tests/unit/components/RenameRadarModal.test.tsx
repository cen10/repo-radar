import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RenameRadarModal } from '@/components/RenameRadarModal';
import * as radarService from '@/services/radar';
import type { Radar } from '@/types/database';

// Mock the radar service
vi.mock('../../../src/services/radar', () => ({
  updateRadar: vi.fn(),
}));

// Helper to create a test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Helper to create a mock radar
const createMockRadar = (overrides?: Partial<Radar>): Radar => ({
  id: 'radar-123',
  user_id: 'user-123',
  name: 'Frontend Tools',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const defaultProps = {
  radar: createMockRadar(),
  onClose: vi.fn(),
};

describe('RenameRadarModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: ReactElement, customQueryClient?: QueryClient) => {
    const client = customQueryClient ?? queryClient;
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  };

  describe('Rendering', () => {
    it('renders modal with current radar name', () => {
      renderWithProviders(<RenameRadarModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/rename radar/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Frontend Tools')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('disables Save button when name is unchanged', () => {
      renderWithProviders(<RenameRadarModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('disables Save button when name is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RenameRadarModal {...defaultProps} />);

      const input = screen.getByDisplayValue('Frontend Tools');
      await user.clear(input);

      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('disables Save button when name is only whitespace', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RenameRadarModal {...defaultProps} />);

      const input = screen.getByDisplayValue('Frontend Tools');
      await user.clear(input);
      await user.type(input, '   ');

      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('enables Save button when name is changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RenameRadarModal {...defaultProps} />);

      const input = screen.getByDisplayValue('Frontend Tools');
      await user.clear(input);
      await user.type(input, 'Backend Tools');

      expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });
  });

  describe('Cancel action', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithProviders(<RenameRadarModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rename action', () => {
    it('calls updateRadar with new name on submit', async () => {
      const user = userEvent.setup();
      const updatedRadar = createMockRadar({ name: 'Backend Tools' });
      vi.mocked(radarService.updateRadar).mockResolvedValue(updatedRadar);

      renderWithProviders(<RenameRadarModal {...defaultProps} />);

      const input = screen.getByDisplayValue('Frontend Tools');
      await user.clear(input);
      await user.type(input, 'Backend Tools');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(radarService.updateRadar).toHaveBeenCalledWith('radar-123', 'Backend Tools');
      });
    });

    it('calls onRenamed callback on success', async () => {
      const user = userEvent.setup();
      const onRenamed = vi.fn();
      const updatedRadar = createMockRadar({ name: 'Backend Tools' });
      vi.mocked(radarService.updateRadar).mockResolvedValue(updatedRadar);

      renderWithProviders(<RenameRadarModal {...defaultProps} onRenamed={onRenamed} />);

      const input = screen.getByDisplayValue('Frontend Tools');
      await user.clear(input);
      await user.type(input, 'Backend Tools');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(onRenamed).toHaveBeenCalledWith(updatedRadar);
      });
    });

    it('shows error message on rename failure', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.updateRadar).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<RenameRadarModal {...defaultProps} />);

      const input = screen.getByDisplayValue('Frontend Tools');
      await user.clear(input);
      await user.type(input, 'Backend Tools');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('invalidates radar caches on success', async () => {
      const user = userEvent.setup();
      const testQueryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(testQueryClient, 'invalidateQueries');
      const updatedRadar = createMockRadar({ name: 'Backend Tools' });
      vi.mocked(radarService.updateRadar).mockResolvedValue(updatedRadar);

      renderWithProviders(<RenameRadarModal {...defaultProps} />, testQueryClient);

      const input = screen.getByDisplayValue('Frontend Tools');
      await user.clear(input);
      await user.type(input, 'Backend Tools');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['radar', 'radar-123'] });
      });
    });
  });

  describe('Modal closing behavior', () => {
    it('does not close modal during submission', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      let resolveUpdate!: (radar: Radar) => void;
      const updatePromise = new Promise<Radar>((resolve) => {
        resolveUpdate = resolve;
      });
      vi.mocked(radarService.updateRadar).mockReturnValue(updatePromise);

      renderWithProviders(<RenameRadarModal {...defaultProps} onClose={onClose} />);

      const input = screen.getByDisplayValue('Frontend Tools');
      await user.clear(input);
      await user.type(input, 'Backend Tools');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Try to click cancel while submitting
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).not.toHaveBeenCalled();

      // Resolve the promise
      resolveUpdate(createMockRadar({ name: 'Backend Tools' }));
    });
  });
});
