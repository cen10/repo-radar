import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortDropdown } from './SortDropdown';

describe('SortDropdown', () => {
  const options = [
    { value: 'updated' as const, label: 'Recently Updated' },
    { value: 'stars' as const, label: 'Most Stars' },
  ];

  const defaultProps = {
    value: 'updated' as const,
    onChange: vi.fn(),
    options,
  };

  it('renders select with options', () => {
    render(<SortDropdown {...defaultProps} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recently Updated' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Most Stars' })).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<SortDropdown {...defaultProps} value="stars" />);

    expect(screen.getByRole('combobox')).toHaveValue('stars');
  });

  it('calls onChange when selection changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortDropdown {...defaultProps} onChange={onChange} />);

    await user.selectOptions(screen.getByRole('combobox'), 'stars');

    expect(onChange).toHaveBeenCalledWith('stars');
  });

  it('has accessible label', () => {
    render(<SortDropdown {...defaultProps} />);

    expect(screen.getByLabelText(/sort repositories/i)).toBeInTheDocument();
  });
});
