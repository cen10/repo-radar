import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateRadarModal } from './CreateRadarModal';
import * as radarService from '../services/radar';
import type { Radar } from '../types/database';

// Mock the radar service
vi.mock('../services/radar', () => ({
  createRadar: vi.fn(),
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
  name: 'Test Radar',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const defaultProps = {
  onClose: vi.fn(),
};

describe('CreateRadarModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement, customQueryClient?: QueryClient) => {
    const client = customQueryClient ?? queryClient;
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  };

  describe('Rendering', () => {
    it('renders modal with form', () => {
      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create radar/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/radar name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form interaction', () => {
    it('updates input value when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'My New Radar');

      expect(input).toHaveValue('My New Radar');
    });

    it('disables Create button when input is empty', () => {
      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).toBeDisabled();
    });

    it('enables Create button when input has value', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Valid Name');

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).not.toBeDisabled();
    });

    it('trims whitespace from input for button state', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, '   ');

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).toBeDisabled();
    });
  });

  describe('Validation', () => {
    it('limits input to 50 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      const longName = 'a'.repeat(60);
      await user.type(input, longName);

      // Input should be truncated to 50 characters
      expect(input).toHaveValue('a'.repeat(50));
    });

    it('clears error when user modifies input', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.createRadar).mockRejectedValueOnce(new Error('Test error'));

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Test Name');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      expect(await screen.findByText(/test error/i)).toBeInTheDocument();

      // Modify input to clear error
      await user.type(input, ' modified');

      expect(screen.queryByText(/test error/i)).not.toBeInTheDocument();
    });
  });

  describe('Submission', () => {
    it('calls createRadar service on valid submit', async () => {
      const user = userEvent.setup();
      const mockRadar = createMockRadar({ name: 'My Radar' });
      vi.mocked(radarService.createRadar).mockResolvedValue(mockRadar);

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'My Radar');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(radarService.createRadar).toHaveBeenCalledWith('My Radar');
      });
    });

    it('trims whitespace from name when submitting', async () => {
      const user = userEvent.setup();
      const mockRadar = createMockRadar({ name: 'Trimmed Name' });
      vi.mocked(radarService.createRadar).mockResolvedValue(mockRadar);

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, '  Trimmed Name  ');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(radarService.createRadar).toHaveBeenCalledWith('Trimmed Name');
      });
    });

    it('shows loading spinner during submission', async () => {
      const user = userEvent.setup();
      // Never resolve to keep loading state
      vi.mocked(radarService.createRadar).mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Loading Radar');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      // Check for spinner SVG inside the button
      await waitFor(() => {
        const spinner = createButton.querySelector('svg.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
      expect(createButton).toBeDisabled();
    });

    it('disables cancel button during submission', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.createRadar).mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Loading Radar');

      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      });
    });

    it('disables input during submission', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.createRadar).mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Loading Radar');

      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('Success handling', () => {
    it('invalidates radars cache on success', async () => {
      const user = userEvent.setup();
      const mockRadar = createMockRadar({ name: 'Success Radar' });
      vi.mocked(radarService.createRadar).mockResolvedValue(mockRadar);

      const testQueryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(testQueryClient, 'invalidateQueries');

      renderWithProviders(<CreateRadarModal {...defaultProps} />, testQueryClient);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Success Radar');

      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['radars'],
        });
      });
    });

    it('calls onClose on success', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const mockRadar = createMockRadar({ name: 'Close Radar' });
      vi.mocked(radarService.createRadar).mockResolvedValue(mockRadar);

      renderWithProviders(<CreateRadarModal {...defaultProps} onClose={onClose} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Close Radar');

      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('calls onSuccess callback with created radar', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const mockRadar = createMockRadar({ id: 'new-radar-id', name: 'Callback Radar' });
      vi.mocked(radarService.createRadar).mockResolvedValue(mockRadar);

      renderWithProviders(<CreateRadarModal {...defaultProps} onSuccess={onSuccess} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Callback Radar');

      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockRadar);
      });
    });
  });

  describe('Error handling', () => {
    it('shows error message on API failure', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.createRadar).mockRejectedValue(new Error('Failed to create radar'));

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Error Radar');

      await user.click(screen.getByRole('button', { name: /create/i }));

      expect(await screen.findByText(/failed to create radar/i)).toBeInTheDocument();
    });

    it('shows specific error message from service', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.createRadar).mockRejectedValue(
        new Error('You can only have 5 radars')
      );

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Limit Radar');

      await user.click(screen.getByRole('button', { name: /create/i }));

      expect(await screen.findByText(/you can only have 5 radars/i)).toBeInTheDocument();
    });

    it('re-enables form after error', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.createRadar).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Error Radar');

      await user.click(screen.getByRole('button', { name: /create/i }));

      await screen.findByText(/network error/i);

      expect(input).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /create/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).not.toBeDisabled();
    });
  });

  describe('Modal closing', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      renderWithProviders(<CreateRadarModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Form submission via Enter', () => {
    it('submits form when Enter is pressed in input', async () => {
      const user = userEvent.setup();
      const mockRadar = createMockRadar({ name: 'Enter Submit' });
      vi.mocked(radarService.createRadar).mockResolvedValue(mockRadar);

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Enter Submit{Enter}');

      await waitFor(() => {
        expect(radarService.createRadar).toHaveBeenCalledWith('Enter Submit');
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('input has associated label', () => {
      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      expect(input).toBeInTheDocument();
    });

    it('error message is associated with input via aria-describedby', async () => {
      const user = userEvent.setup();
      vi.mocked(radarService.createRadar).mockRejectedValue(new Error('Test error'));

      renderWithProviders(<CreateRadarModal {...defaultProps} />);

      const input = screen.getByLabelText(/radar name/i);
      await user.type(input, 'Error Test');
      await user.click(screen.getByRole('button', { name: /create/i }));

      await screen.findByText(/test error/i);

      expect(input).toHaveAttribute('aria-describedby');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
