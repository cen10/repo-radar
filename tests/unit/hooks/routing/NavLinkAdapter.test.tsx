import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavLinkAdapter } from '@/hooks/routing/NavLinkAdapter';
import { RouterProvider } from '@/hooks/routing/router-context';

const mockNavigate = vi.fn();

function createMockAdapter(pathname: string) {
  return {
    pathname,
    params: {},
    navigate: mockNavigate,
    isNextJs: false,
  };
}

function renderWithRouter(ui: React.ReactElement, pathname = '/') {
  const adapter = createMockAdapter(pathname);
  return render(<RouterProvider adapter={adapter}>{ui}</RouterProvider>);
}

describe('NavLinkAdapter', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders a link with correct href', () => {
    renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>);

    const link = screen.getByRole('link', { name: /stars/i });
    expect(link).toHaveAttribute('href', '/stars');
  });

  it('navigates on normal click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>);

    await user.click(screen.getByRole('link', { name: /stars/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/stars');
  });

  it('calls onClick callback on normal click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithRouter(
      <NavLinkAdapter to="/stars" onClick={onClick}>
        Stars
      </NavLinkAdapter>
    );

    await user.click(screen.getByRole('link', { name: /stars/i }));

    expect(onClick).toHaveBeenCalled();
  });

  it('does not navigate on Ctrl+click (new tab)', () => {
    renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      ctrlKey: true,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on Meta+click (Cmd+click on Mac)', () => {
    renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      metaKey: true,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on Shift+click (new window)', () => {
    renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      shiftKey: true,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on Alt+click', () => {
    renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      altKey: true,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on middle-click', () => {
    renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>);

    fireEvent.click(screen.getByRole('link', { name: /stars/i }), {
      button: 1,
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  describe('active state', () => {
    it('sets aria-current="page" when pathname matches exactly', () => {
      renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>, '/stars');

      const link = screen.getByRole('link', { name: /stars/i });
      expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('sets aria-current="page" when pathname is a child route', () => {
      renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>, '/stars/repo/123');

      const link = screen.getByRole('link', { name: /stars/i });
      expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('does not set aria-current when pathname does not match', () => {
      renderWithRouter(<NavLinkAdapter to="/stars">Stars</NavLinkAdapter>, '/explore');

      const link = screen.getByRole('link', { name: /stars/i });
      expect(link).not.toHaveAttribute('aria-current');
    });

    it('passes isActive=true to className function when active', () => {
      const classNameFn = vi.fn().mockReturnValue('active-class');
      renderWithRouter(
        <NavLinkAdapter to="/stars" className={classNameFn}>
          Stars
        </NavLinkAdapter>,
        '/stars'
      );

      expect(classNameFn).toHaveBeenCalledWith({ isActive: true });
      expect(screen.getByRole('link', { name: /stars/i })).toHaveClass('active-class');
    });

    it('passes isActive=false to className function when inactive', () => {
      const classNameFn = vi.fn().mockReturnValue('inactive-class');
      renderWithRouter(
        <NavLinkAdapter to="/stars" className={classNameFn}>
          Stars
        </NavLinkAdapter>,
        '/explore'
      );

      expect(classNameFn).toHaveBeenCalledWith({ isActive: false });
      expect(screen.getByRole('link', { name: /stars/i })).toHaveClass('inactive-class');
    });

    it('passes isActive to children render function', () => {
      renderWithRouter(
        <NavLinkAdapter to="/stars">
          {({ isActive }) => (isActive ? 'Active Stars' : 'Inactive Stars')}
        </NavLinkAdapter>,
        '/stars'
      );

      expect(screen.getByRole('link', { name: /active stars/i })).toBeInTheDocument();
    });
  });

  it('passes aria-label to the anchor', () => {
    renderWithRouter(
      <NavLinkAdapter to="/stars" aria-label="View starred repos">
        Stars
      </NavLinkAdapter>
    );

    const link = screen.getByRole('link', { name: /view starred repos/i });
    expect(link).toBeInTheDocument();
  });

  it('passes data-tour attribute to the anchor', () => {
    renderWithRouter(
      <NavLinkAdapter to="/stars" data-tour="stars-link">
        Stars
      </NavLinkAdapter>
    );

    const link = screen.getByRole('link', { name: /stars/i });
    expect(link).toHaveAttribute('data-tour', 'stars-link');
  });

  it('applies string className to the anchor', () => {
    renderWithRouter(
      <NavLinkAdapter to="/stars" className="my-link-class">
        Stars
      </NavLinkAdapter>
    );

    const link = screen.getByRole('link', { name: /stars/i });
    expect(link).toHaveClass('my-link-class');
  });
});
