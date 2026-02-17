import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader, type PageHeaderProps } from '@/components/PageHeader';

// Mock child components to isolate PageHeader logic
vi.mock('@/components/SearchBar', () => ({
  SearchBar: ({ id, placeholder, value }: { id: string; placeholder: string; value: string }) => (
    <input data-testid="mock-search-bar" id={id} placeholder={placeholder} defaultValue={value} />
  ),
}));

vi.mock('@/components/SortDropdown', () => ({
  SortDropdown: () => <div data-testid="mock-sort-dropdown" />,
}));

const defaultProps: PageHeaderProps = {
  title: 'Test Title',
  titleIcon: <span data-testid="title-icon">icon</span>,
  showSearchBar: true,
  searchId: 'test-search',
  searchValue: '',
  onSearchChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  searchPlaceholder: 'Search...',
  sortValue: 'updated',
  onSortChange: vi.fn(),
  sortOptions: [{ value: 'updated' as const, label: 'Recently Updated' }],
};

describe('PageHeader', () => {
  describe('title section', () => {
    it('renders title with icon', () => {
      render(<PageHeader {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /test title/i })).toBeInTheDocument();
      expect(screen.getByTestId('title-icon')).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
      render(<PageHeader {...defaultProps} subtitle="Test subtitle" />);

      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('does not render subtitle when not provided', () => {
      render(<PageHeader {...defaultProps} />);

      expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument();
    });

    it('renders actionMenu when provided', () => {
      render(<PageHeader {...defaultProps} actionMenu={<button>Action</button>} />);

      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('applies titleTourId as data-tour attribute', () => {
      render(<PageHeader {...defaultProps} titleTourId="my-tour-id" />);

      const heading = screen.getByRole('heading', { name: /test title/i });
      expect(heading).toHaveAttribute('data-tour', 'my-tour-id');
    });
  });

  describe('search/sort visibility', () => {
    it('shows search and sort when showSearchBar is true', () => {
      render(<PageHeader {...defaultProps} showSearchBar={true} />);

      expect(screen.getByTestId('mock-search-bar')).toBeInTheDocument();
      expect(screen.getByTestId('mock-sort-dropdown')).toBeInTheDocument();
    });

    it('hides search and sort when showSearchBar is false', () => {
      render(<PageHeader {...defaultProps} showSearchBar={false} />);

      expect(screen.queryByTestId('mock-search-bar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-sort-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('tour attributes', () => {
    it('applies searchTourId to search wrapper', () => {
      render(<PageHeader {...defaultProps} searchTourId="search-tour" />);

      const searchWrapper = screen.getByTestId('mock-search-bar').parentElement;
      expect(searchWrapper).toHaveAttribute('data-tour', 'search-tour');
    });

    it('applies sortTourId to sort wrapper', () => {
      render(<PageHeader {...defaultProps} sortTourId="sort-tour" />);

      const sortWrapper = screen.getByTestId('mock-sort-dropdown').parentElement;
      expect(sortWrapper).toHaveAttribute('data-tour', 'sort-tour');
    });

    it('does not apply data-tour when tourId not provided', () => {
      render(<PageHeader {...defaultProps} />);

      const heading = screen.getByRole('heading', { name: /test title/i });
      expect(heading).not.toHaveAttribute('data-tour');
    });
  });

  describe('search props', () => {
    it('passes searchId to SearchBar', () => {
      render(<PageHeader {...defaultProps} searchId="custom-search-id" />);

      expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('id', 'custom-search-id');
    });

    it('passes placeholder to SearchBar', () => {
      render(<PageHeader {...defaultProps} searchPlaceholder="Custom placeholder" />);

      expect(screen.getByTestId('mock-search-bar')).toHaveAttribute(
        'placeholder',
        'Custom placeholder'
      );
    });
  });
});
