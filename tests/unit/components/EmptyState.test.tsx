import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  EmptyState,
  EmptyRadarState,
  NoStarredReposState,
  NoSearchResultsState,
} from '@/components/EmptyState';

const renderWithRouter = (ui: ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(
      <EmptyState
        icon={<svg data-testid="test-icon" />}
        title="No items"
        description="Add some items to get started."
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Add some items to get started.')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <EmptyState
        icon={<svg data-testid="test-icon" />}
        title="No items"
        actions={<button>Add Item</button>}
      />
    );

    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState icon={<svg data-testid="test-icon" />} title="No items" />);

    expect(screen.queryByText(/add some items/i)).not.toBeInTheDocument();
  });

  it('does not render actions container when no actions provided', () => {
    const { container } = render(
      <EmptyState icon={<svg data-testid="test-icon" />} title="No items" />
    );

    // The actions container has mt-6 flex gap-4 justify-center classes
    expect(container.querySelector('.mt-6.flex.gap-4')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState
        icon={<svg data-testid="test-icon" />}
        title="No items"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('EmptyRadarState', () => {
  it('renders radar icon', () => {
    renderWithRouter(<EmptyRadarState />);

    // StaticRadarIcon is an SVG with concentric circles
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders correct title and description', () => {
    renderWithRouter(<EmptyRadarState />);

    expect(screen.getByText(/no repos on this radar yet/i)).toBeInTheDocument();
    expect(screen.getByText(/add repos from my stars or explore/i)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithRouter(<EmptyRadarState />);

    expect(screen.getByRole('link', { name: /go to my stars/i })).toHaveAttribute('href', '/stars');
    expect(screen.getByRole('link', { name: /explore repos/i })).toHaveAttribute(
      'href',
      '/explore'
    );
  });
});

describe('NoStarredReposState', () => {
  it('renders star icon', () => {
    renderWithRouter(<NoStarredReposState />);

    // The StarIcon from heroicons
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders correct title and description', () => {
    renderWithRouter(<NoStarredReposState />);

    expect(screen.getByText(/no starred repos yet/i)).toBeInTheDocument();
    expect(screen.getByText(/star repos on github/i)).toBeInTheDocument();
  });

  it('renders explore link', () => {
    renderWithRouter(<NoStarredReposState />);

    expect(screen.getByRole('link', { name: /explore repos/i })).toHaveAttribute(
      'href',
      '/explore'
    );
  });
});

describe('NoSearchResultsState', () => {
  it('renders magnifying glass icon', () => {
    render(<NoSearchResultsState onClearSearch={() => {}} />);

    // The MagnifyingGlassIcon from heroicons
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders correct title and description', () => {
    render(<NoSearchResultsState onClearSearch={() => {}} />);

    expect(screen.getByText(/no repos found/i)).toBeInTheDocument();
    expect(screen.getByText(/try adjusting your search/i)).toBeInTheDocument();
  });

  it('calls onClearSearch when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleClearSearch = vi.fn();

    render(<NoSearchResultsState onClearSearch={handleClearSearch} />);

    await user.click(screen.getByRole('button', { name: /clear search/i }));

    expect(handleClearSearch).toHaveBeenCalledTimes(1);
  });
});
