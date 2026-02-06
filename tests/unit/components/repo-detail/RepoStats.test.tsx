import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepoStats } from '@/components/repo-detail/RepoStats';
import { createMockRepository } from '../../../mocks/factories';

const defaultRepo = createMockRepository({
  stargazers_count: 12500,
  forks_count: 3200,
  watchers_count: 450,
  open_issues_count: 127,
});

describe('RepoStats', () => {
  describe('stats display', () => {
    it('renders star count with compact formatting', () => {
      render(<RepoStats repository={defaultRepo} />);

      expect(screen.getByText('12.5k')).toBeInTheDocument();
      expect(screen.getByText('stars')).toBeInTheDocument();
    });

    it('renders fork count with compact formatting', () => {
      render(<RepoStats repository={defaultRepo} />);

      expect(screen.getByText('3.2k')).toBeInTheDocument();
      expect(screen.getByText('forks')).toBeInTheDocument();
    });

    it('renders watcher count with compact formatting', () => {
      render(<RepoStats repository={defaultRepo} />);

      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('watchers')).toBeInTheDocument();
    });

    it('renders small numbers without formatting', () => {
      render(
        <RepoStats
          repository={{
            ...defaultRepo,
            stargazers_count: 42,
            forks_count: 5,
            watchers_count: 10,
          }}
        />
      );

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('external links', () => {
    it('renders issues link with correct href', () => {
      render(<RepoStats repository={defaultRepo} />);

      const issuesLink = screen.getByRole('link', { name: /open issues/i });
      expect(issuesLink).toHaveAttribute('href', 'https://github.com/user/test-repo/issues');
      expect(issuesLink).toHaveAttribute('target', '_blank');
    });

    it('renders pull requests link with correct href', () => {
      render(<RepoStats repository={defaultRepo} />);

      const prsLink = screen.getByRole('link', { name: /pull requests/i });
      expect(prsLink).toHaveAttribute('href', 'https://github.com/user/test-repo/pulls');
      expect(prsLink).toHaveAttribute('target', '_blank');
    });

    it('displays formatted issue count in link', () => {
      render(<RepoStats repository={defaultRepo} />);

      expect(screen.getByText(/127 open issues/i)).toBeInTheDocument();
    });

    it('formats large issue counts', () => {
      render(<RepoStats repository={{ ...defaultRepo, open_issues_count: 1500 }} />);

      expect(screen.getByText(/1\.5k open issues/i)).toBeInTheDocument();
    });
  });
});
