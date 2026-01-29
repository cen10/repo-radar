import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoReleases } from './RepoReleases';
import { createMockRelease } from '../../test/mocks/factories';

const defaultRelease = createMockRelease();

const defaultProps = {
  releases: [defaultRelease],
  isLoading: false,
  releasesUrl: 'https://github.com/owner/repo/releases',
};

describe('RepoReleases', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-16T10:00:00Z'));
  });

  describe('heading', () => {
    it('renders heading with link to releases page', () => {
      render(<RepoReleases {...defaultProps} />);

      const headingLink = screen.getByRole('link', { name: /latest releases/i });
      expect(headingLink).toHaveAttribute('href', 'https://github.com/owner/repo/releases');
      expect(headingLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('loading state', () => {
    it('shows loading message while loading', () => {
      render(<RepoReleases {...defaultProps} isLoading={true} releases={[]} />);

      expect(screen.getByText(/loading releases/i)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no releases', () => {
      render(<RepoReleases {...defaultProps} releases={[]} />);

      expect(screen.getByText(/no releases yet/i)).toBeInTheDocument();
    });
  });

  describe('release list', () => {
    it('renders release name', () => {
      render(<RepoReleases {...defaultProps} />);

      expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    });

    it('renders tag name when name is absent', () => {
      render(<RepoReleases {...defaultProps} releases={[{ ...defaultRelease, name: null }]} />);

      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    it('renders publish date with author', () => {
      render(<RepoReleases {...defaultProps} />);

      expect(screen.getByText(/published.*by releaser/i)).toBeInTheDocument();
    });

    it('shows prerelease badge when applicable', () => {
      render(
        <RepoReleases {...defaultProps} releases={[{ ...defaultRelease, prerelease: true }]} />
      );

      expect(screen.getByText('Pre-release')).toBeInTheDocument();
    });

    it('limits display to 3 releases', () => {
      const manyReleases = Array.from({ length: 5 }, (_, i) =>
        createMockRelease({ id: i + 1, name: `Release ${i + 1}` })
      );
      render(<RepoReleases {...defaultProps} releases={manyReleases} />);

      expect(screen.getByText('Release 1')).toBeInTheDocument();
      expect(screen.getByText('Release 2')).toBeInTheDocument();
      expect(screen.getByText('Release 3')).toBeInTheDocument();
      expect(screen.queryByText('Release 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Release 5')).not.toBeInTheDocument();
    });
  });

  describe('accordion behavior', () => {
    it('release row is initially collapsed', () => {
      render(<RepoReleases {...defaultProps} />);

      expect(screen.queryByText('Release notes for v1.0.0')).not.toBeInTheDocument();
    });

    it('expands release details when clicked', async () => {
      const user = userEvent.setup();
      render(<RepoReleases {...defaultProps} />);

      const releaseButton = screen.getByRole('button', { expanded: false });
      await user.click(releaseButton);

      expect(screen.getByText('Release notes for v1.0.0')).toBeInTheDocument();
      expect(releaseButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapses release details when clicked again', async () => {
      const user = userEvent.setup();
      render(<RepoReleases {...defaultProps} />);

      const releaseButton = screen.getByRole('button');
      await user.click(releaseButton); // expand
      await user.click(releaseButton); // collapse

      expect(screen.queryByText('Release notes for v1.0.0')).not.toBeInTheDocument();
      expect(releaseButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('shows "No release notes" when body is empty', async () => {
      const user = userEvent.setup();
      render(<RepoReleases {...defaultProps} releases={[{ ...defaultRelease, body: '' }]} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText(/no release notes/i)).toBeInTheDocument();
    });

    it('shows View on GitHub link when expanded', async () => {
      const user = userEvent.setup();
      render(<RepoReleases {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      const githubLink = screen.getByRole('link', { name: /view on github/i });
      expect(githubLink).toHaveAttribute(
        'href',
        'https://github.com/owner/repo/releases/tag/v1.0.0'
      );
    });

    it('only expands one release at a time', async () => {
      const user = userEvent.setup();
      const releases = [
        createMockRelease({ id: 1, name: 'Release 1', body: 'Notes 1' }),
        createMockRelease({ id: 2, name: 'Release 2', body: 'Notes 2' }),
      ];
      render(<RepoReleases {...defaultProps} releases={releases} />);

      const [button1, button2] = screen.getAllByRole('button');

      await user.click(button1);
      expect(screen.getByText('Notes 1')).toBeInTheDocument();

      await user.click(button2);
      expect(screen.queryByText('Notes 1')).not.toBeInTheDocument();
      expect(screen.getByText('Notes 2')).toBeInTheDocument();
    });
  });
});
