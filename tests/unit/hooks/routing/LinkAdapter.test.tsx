import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkAdapter } from '@/hooks/routing/LinkAdapter';
import { RouterProvider } from '@/hooks/routing/router-context';

const mockNavigate = vi.fn();
const mockAdapter = {
  pathname: '/',
  params: {},
  navigate: mockNavigate,
  isNextJs: false,
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<RouterProvider adapter={mockAdapter}>{ui}</RouterProvider>);
}

describe('LinkAdapter', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders a link with correct href', () => {
    renderWithRouter(<LinkAdapter to="/stars">Stars</LinkAdapter>);

    const link = screen.getByRole('link', { name: /stars/i });
    expect(link).toHaveAttribute('href', '/stars');
  });

  it('navigates on normal click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LinkAdapter to="/stars">Stars</LinkAdapter>);

    await user.click(screen.getByRole('link', { name: /stars/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/stars');
  });

  it('calls onClick callback on normal click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithRouter(
      <LinkAdapter to="/stars" onClick={onClick}>
        Stars
      </LinkAdapter>
    );

    await user.click(screen.getByRole('link', { name: /stars/i }));

    expect(onClick).toHaveBeenCalled();
  });

  it('does not navigate on Ctrl+click (new tab)', () => {
    renderWithRouter(<LinkAdapter to="/stars">Stars</LinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      ctrlKey: true,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on Meta+click (Cmd+click on Mac)', () => {
    renderWithRouter(<LinkAdapter to="/stars">Stars</LinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      metaKey: true,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on Shift+click (new window)', () => {
    renderWithRouter(<LinkAdapter to="/stars">Stars</LinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      shiftKey: true,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on Alt+click', () => {
    renderWithRouter(<LinkAdapter to="/stars">Stars</LinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      altKey: true,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on middle-click', () => {
    renderWithRouter(<LinkAdapter to="/stars">Stars</LinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      button: 1,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('passes aria-label to the anchor', () => {
    renderWithRouter(
      <LinkAdapter to="/stars" aria-label="View starred repos">
        Stars
      </LinkAdapter>
    );

    const link = screen.getByRole('link', { name: /view starred repos/i });
    expect(link).toBeInTheDocument();
  });

  it('passes data-tour attribute to the anchor', () => {
    renderWithRouter(
      <LinkAdapter to="/stars" data-tour="stars-link">
        Stars
      </LinkAdapter>
    );

    const link = screen.getByRole('link', { name: /stars/i });
    expect(link).toHaveAttribute('data-tour', 'stars-link');
  });

  it('applies className to the anchor', () => {
    renderWithRouter(
      <LinkAdapter to="/stars" className="my-link-class">
        Stars
      </LinkAdapter>
    );

    const link = screen.getByRole('link', { name: /stars/i });
    expect(link).toHaveClass('my-link-class');
  });
});
