import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Button } from './Button';

describe('Button', () => {
  describe('variants', () => {
    it('renders primary variant with indigo background', () => {
      render(<Button variant="primary">Submit</Button>);
      const button = screen.getByRole('button', { name: /submit/i });
      expect(button).toHaveClass('bg-indigo-600');
    });

    it('renders secondary variant with border and white background', () => {
      render(<Button variant="secondary">Cancel</Button>);
      const button = screen.getByRole('button', { name: /cancel/i });
      expect(button).toHaveClass('border', 'bg-white', 'text-gray-700');
    });

    it('renders danger variant with red background', () => {
      render(<Button variant="danger">Delete</Button>);
      const button = screen.getByRole('button', { name: /delete/i });
      expect(button).toHaveClass('bg-red-600');
    });

    it('renders ghost variant with minimal styling', () => {
      render(<Button variant="ghost">Menu</Button>);
      const button = screen.getByRole('button', { name: /menu/i });
      expect(button).toHaveClass('text-gray-500', 'hover:bg-gray-100');
    });

    it('renders ghost-primary variant with indigo hover', () => {
      render(<Button variant="ghost-primary">Action</Button>);
      const button = screen.getByRole('button', { name: /action/i });
      expect(button).toHaveClass('text-gray-400', 'hover:bg-indigo-50');
    });

    it('renders link variant with indigo text', () => {
      render(<Button variant="link">Learn more</Button>);
      const button = screen.getByRole('button', { name: /learn more/i });
      expect(button).toHaveClass('text-indigo-600', 'hover:underline');
    });

    it('defaults to primary variant', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button', { name: /default/i });
      expect(button).toHaveClass('bg-indigo-600');
    });
  });

  describe('sizes', () => {
    it('renders sm size with smaller padding', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button', { name: /small/i });
      expect(button).toHaveClass('px-3', 'py-1.5');
    });

    it('renders md size with medium padding', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button', { name: /medium/i });
      expect(button).toHaveClass('px-4', 'py-2');
    });

    it('renders lg size with larger padding', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button', { name: /large/i });
      expect(button).toHaveClass('px-6', 'py-3');
    });

    it('defaults to md size', () => {
      render(<Button>Default Size</Button>);
      const button = screen.getByRole('button', { name: /default size/i });
      expect(button).toHaveClass('px-4', 'py-2');
    });

    it('uses square padding for ghost variant', () => {
      render(
        <Button variant="ghost" size="sm">
          Icon
        </Button>
      );
      const button = screen.getByRole('button', { name: /icon/i });
      expect(button).toHaveClass('p-1');
      expect(button).not.toHaveClass('px-3');
    });

    it('uses square padding for ghost-primary variant', () => {
      render(
        <Button variant="ghost-primary" size="sm">
          Icon
        </Button>
      );
      const button = screen.getByRole('button', { name: /icon/i });
      expect(button).toHaveClass('p-1');
      expect(button).not.toHaveClass('px-3');
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when loading', () => {
      render(<Button loading>Submit</Button>);
      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('sets aria-busy when loading', () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('shows loadingText when provided', () => {
      render(
        <Button loading loadingText="Saving...">
          Save
        </Button>
      );
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });

    it('hides children text when loading without loadingText', () => {
      render(<Button loading>Submit</Button>);
      expect(screen.queryByText(/submit/i)).not.toBeInTheDocument();
    });

    it('disables button when loading', () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('does not show spinner when not loading', () => {
      render(<Button>Submit</Button>);
      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables button when disabled prop is true', () => {
      render(<Button disabled>Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('applies disabled styling', () => {
      render(<Button disabled>Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByRole('button', { name: /click me/i }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Click me
        </Button>
      );

      await user.click(screen.getByRole('button', { name: /click me/i }));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Click me
        </Button>
      );

      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to button element', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Submit</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('className merging', () => {
    it('merges custom className with defaults', () => {
      render(<Button className="w-[72px]">Save</Button>);
      const button = screen.getByRole('button', { name: /save/i });
      expect(button).toHaveClass('w-[72px]', 'bg-indigo-600');
    });
  });

  describe('fullWidth', () => {
    it('applies w-full when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button', { name: /full width/i });
      expect(button).toHaveClass('w-full');
    });

    it('does not apply w-full by default', () => {
      render(<Button>Normal</Button>);
      const button = screen.getByRole('button', { name: /normal/i });
      expect(button).not.toHaveClass('w-full');
    });
  });

  describe('button type', () => {
    it('defaults to type="button"', () => {
      render(<Button>Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('allows type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });
});
