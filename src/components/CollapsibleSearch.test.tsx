import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSearch } from './CollapsibleSearch';

describe('CollapsibleSearch', () => {
  const defaultProps = {
    id: 'test-search',
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    placeholder: 'Search repos...',
  };

  let originalPlatform: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(navigator, 'platform', originalPlatform);
    }
  });

  function mockPlatform(platform: string) {
    Object.defineProperty(navigator, 'platform', {
      value: platform,
      configurable: true,
    });
  }

  describe('collapsed state', () => {
    it('renders toggle button with search icon', () => {
      render(<CollapsibleSearch {...defaultProps} />);

      expect(screen.getByRole('button', { name: /open search/i })).toBeInTheDocument();
    });

    it('shows keyboard shortcut hint for Mac', () => {
      mockPlatform('MacIntel');
      render(<CollapsibleSearch {...defaultProps} />);

      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });

    it('shows keyboard shortcut hint for Windows/Linux', () => {
      mockPlatform('Win32');
      render(<CollapsibleSearch {...defaultProps} />);

      expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
    });

    it('does not show search input when collapsed', () => {
      render(<CollapsibleSearch {...defaultProps} />);

      expect(screen.queryByPlaceholderText('Search repos...')).not.toBeInTheDocument();
    });

    it('has aria-expanded false when collapsed', () => {
      render(<CollapsibleSearch {...defaultProps} />);

      expect(screen.getByRole('button', { name: /open search/i })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });
  });

  describe('expand triggers', () => {
    it('expands when toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /open search/i }));

      expect(screen.getByPlaceholderText('Search repos...')).toBeInTheDocument();
    });

    it('expands when Cmd+K is pressed on Mac', async () => {
      mockPlatform('MacIntel');
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      await user.keyboard('{Meta>}k{/Meta}');

      expect(screen.getByPlaceholderText('Search repos...')).toBeInTheDocument();
    });

    it('expands when Ctrl+K is pressed on Windows', async () => {
      mockPlatform('Win32');
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      await user.keyboard('{Control>}k{/Control}');

      expect(screen.getByPlaceholderText('Search repos...')).toBeInTheDocument();
    });
  });

  describe('expanded state', () => {
    it('shows search input when expanded', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /open search/i }));

      expect(screen.getByPlaceholderText('Search repos...')).toBeInTheDocument();
    });

    it('shows close button when expanded', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /open search/i }));

      expect(screen.getByRole('button', { name: /close search/i })).toBeInTheDocument();
    });

    it('auto-focuses input when expanded', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /open search/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search repos...')).toHaveFocus();
      });
    });

    it('does not show toggle button when expanded', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /open search/i }));

      expect(screen.queryByRole('button', { name: /open search/i })).not.toBeInTheDocument();
    });
  });

  describe('close triggers', () => {
    it('collapses when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      // Expand first
      await user.click(screen.getByRole('button', { name: /open search/i }));
      expect(screen.getByPlaceholderText('Search repos...')).toBeInTheDocument();

      // Then close
      await user.click(screen.getByRole('button', { name: /close search/i }));

      expect(screen.queryByPlaceholderText('Search repos...')).not.toBeInTheDocument();
    });

    it('collapses when Escape is pressed while focused in search', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      // Expand first
      await user.click(screen.getByRole('button', { name: /open search/i }));
      const input = screen.getByPlaceholderText('Search repos...');
      expect(input).toBeInTheDocument();

      // Focus input and press Escape
      input.focus();
      await user.keyboard('{Escape}');

      expect(screen.queryByPlaceholderText('Search repos...')).not.toBeInTheDocument();
    });

    it('returns focus to toggle button when collapsed via close button', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      // Expand and then close
      await user.click(screen.getByRole('button', { name: /open search/i }));
      await user.click(screen.getByRole('button', { name: /close search/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open search/i })).toHaveFocus();
      });
    });

    it('returns focus to toggle button when collapsed via Escape', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      // Expand and focus input
      await user.click(screen.getByRole('button', { name: /open search/i }));
      screen.getByPlaceholderText('Search repos...').focus();

      // Press Escape
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open search/i })).toHaveFocus();
      });
    });
  });

  describe('search functionality', () => {
    it('displays the current value', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} value="test query" />);

      await user.click(screen.getByRole('button', { name: /open search/i }));

      expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
    });

    it('calls onChange when typing', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<CollapsibleSearch {...defaultProps} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /open search/i }));
      await user.type(screen.getByPlaceholderText('Search repos...'), 'a');

      expect(onChange).toHaveBeenCalledWith('a');
    });

    it('calls onSubmit when form is submitted', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<CollapsibleSearch {...defaultProps} value="test" onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /open search/i }));
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      expect(onSubmit).toHaveBeenCalledWith('test');
    });

    it('stays expanded after form submission', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} value="test" />);

      await user.click(screen.getByRole('button', { name: /open search/i }));
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      expect(screen.getByPlaceholderText('Search repos...')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('toggle button has aria-controls linking to search container', async () => {
      render(<CollapsibleSearch {...defaultProps} />);

      expect(screen.getByRole('button', { name: /open search/i })).toHaveAttribute(
        'aria-controls',
        'test-search-container'
      );
    });

    it('keyboard shortcut hint is aria-hidden', () => {
      render(<CollapsibleSearch {...defaultProps} />);

      const kbd = screen.getByText(/⌘K|Ctrl\+K/);
      expect(kbd).toHaveAttribute('aria-hidden', 'true');
    });

    it('search input has accessible label', async () => {
      const user = userEvent.setup();
      render(<CollapsibleSearch {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /open search/i }));

      // The input should be accessible via the label "Search"
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      // Check that the input has an associated label
      expect(input).toHaveAccessibleName(/search/i);
    });
  });
});
