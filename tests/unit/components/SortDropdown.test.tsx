import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortDropdown } from '@/components/SortDropdown';

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

  it('renders dropdown button with current selection', () => {
    render(<SortDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Recently Updated');
  });

  it('displays the current value', () => {
    render(<SortDropdown {...defaultProps} value="stars" />);

    expect(screen.getByRole('button')).toHaveTextContent('Most Stars');
  });

  it('shows options when clicked', async () => {
    const user = userEvent.setup();
    render(<SortDropdown {...defaultProps} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('option', { name: 'Recently Updated' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Most Stars' })).toBeInTheDocument();
  });

  it('calls onChange when selection changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortDropdown {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'Most Stars' }));

    expect(onChange).toHaveBeenCalledWith('stars');
  });

  it('marks the selected option', async () => {
    const user = userEvent.setup();
    render(<SortDropdown {...defaultProps} value="stars" />);

    await user.click(screen.getByRole('button'));

    const selectedOption = screen.getByRole('option', { name: 'Most Stars' });
    expect(selectedOption).toHaveAttribute('data-selected');
  });
});
