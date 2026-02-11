import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DemoBanner } from '@/components/DemoBanner';

const mockDemoMode = {
  isBannerVisible: true,
  exitDemoMode: vi.fn(),
  dismissBanner: vi.fn(),
  resetBannerDismissed: vi.fn(),
};

vi.mock('@/demo/use-demo-mode', () => ({
  useDemoMode: () => mockDemoMode,
}));

function renderBanner(route = '/stars') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <DemoBanner />
    </MemoryRouter>
  );
}

describe('DemoBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDemoMode.isBannerVisible = true;

    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('renders nothing when banner is not visible', () => {
    mockDemoMode.isBannerVisible = false;

    const { container } = renderBanner();

    expect(container.innerHTML).toBe('');
  });

  it('renders banner when visible', () => {
    renderBanner();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows "Demo Mode – sample data" on non-explore pages', () => {
    renderBanner('/stars');

    expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
    expect(screen.getByText(/sample data/i)).toBeInTheDocument();
  });

  it('shows search suggestions on explore page', () => {
    renderBanner('/explore');

    expect(screen.getByText(/try:/i)).toBeInTheDocument();
    expect(screen.getByText(/react, typescript, ai, rust/i)).toBeInTheDocument();
  });

  it('calls exitDemoMode and redirects when Exit Demo is clicked', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('button', { name: /exit demo/i }));

    expect(mockDemoMode.exitDemoMode).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/');
  });

  it('calls dismissBanner when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(mockDemoMode.dismissBanner).toHaveBeenCalledTimes(1);
  });

  it('has accessible role and aria-live attribute', () => {
    renderBanner();

    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });
});
