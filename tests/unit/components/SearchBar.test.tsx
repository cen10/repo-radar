import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '@/components/SearchBar';

describe('SearchBar', () => {
  const defaultProps = {
    id: 'test-search',
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    placeholder: 'Search...',
  };

  it('renders input with placeholder', () => {
    render(<SearchBar {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders search button', () => {
    render(<SearchBar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<SearchBar {...defaultProps} value="test query" />);

    expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchBar {...defaultProps} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText('Search...'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('calls onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SearchBar {...defaultProps} value="test" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(onSubmit).toHaveBeenCalledWith('test');
  });

  it('calls onSubmit when Enter is pressed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SearchBar {...defaultProps} value="test" onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('Search...'), '{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('test');
  });

  it('has accessible label', () => {
    render(<SearchBar {...defaultProps} />);

    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
  });
});
