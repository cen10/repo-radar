import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRadars,
  getRadar,
  createRadar,
  updateRadar,
  deleteRadar,
  getRadarRepos,
  addRepoToRadar,
  removeRepoFromRadar,
  getAllRadarRepoIds,
  getRadarsContainingRepo,
  RADAR_LIMITS,
} from '@/services/radar';

// Mock Supabase client
const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn(),
};

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockAuth.getUser(),
    },
  },
}));

const mockUser = { id: 'user-123', email: 'test@example.com' };

// Factory functions to reduce repetition
function createMockRadar(
  overrides: Partial<{
    id: string;
    user_id: string;
    name: string;
    created_at: string;
    updated_at: string;
    radar_repos: { count: number }[];
  }> = {}
) {
  return {
    id: 'radar-1',
    user_id: 'user-123',
    name: 'My Radar',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockRadarRepo(
  overrides: Partial<{
    id: string;
    radar_id: string;
    github_repo_id: number;
    added_at: string;
  }> = {}
) {
  return {
    id: 'repo-1',
    radar_id: 'radar-1',
    github_repo_id: 12345,
    added_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Radar Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe('getRadars', () => {
    it('should fetch all radars with repo counts', async () => {
      const mockRadars = [
        createMockRadar({ radar_repos: [{ count: 3 }] }),
        createMockRadar({ id: 'radar-2', name: 'Another Radar', radar_repos: [{ count: 0 }] }),
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockRadars, error: null }),
        }),
      });

      const result = await getRadars();

      expect(mockFrom).toHaveBeenCalledWith('radars');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'radar-1', name: 'My Radar', repo_count: 3 });
      expect(result[1]).toMatchObject({ id: 'radar-2', name: 'Another Radar', repo_count: 0 });
    });

    it('should handle empty radars list', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await getRadars();
      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      await expect(getRadars()).rejects.toThrow('Failed to fetch radars');
    });
  });

  describe('getRadar', () => {
    it('should fetch a single radar by ID', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createMockRadar(), error: null }),
          }),
        }),
      });

      const result = await getRadar('radar-1');

      expect(mockFrom).toHaveBeenCalledWith('radars');
      expect(result).toMatchObject({ id: 'radar-1', name: 'My Radar' });
    });

    it('should return null when radar not found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const result = await getRadar('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createRadar', () => {
    it('should create a new radar', async () => {
      // Mock count check (0 existing radars)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      });

      // Mock insert
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createMockRadar({ id: 'new-radar', name: 'New Radar' }),
              error: null,
            }),
          }),
        }),
      });

      const result = await createRadar('New Radar');

      expect(result).toMatchObject({ id: 'new-radar', name: 'New Radar' });
    });

    it('should throw error when name is empty', async () => {
      await expect(createRadar('')).rejects.toThrow('Radar name cannot be empty');
      await expect(createRadar('   ')).rejects.toThrow('Radar name cannot be empty');
    });

    it('should throw error when name exceeds 50 characters', async () => {
      const longName = 'a'.repeat(51);
      await expect(createRadar(longName)).rejects.toThrow('Radar name cannot exceed 50 characters');
    });

    it('should throw error when user has max radars', async () => {
      // Mock count check (5 existing radars - at limit)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: RADAR_LIMITS.MAX_RADARS_PER_USER,
            error: null,
          }),
        }),
      });

      await expect(createRadar('New Radar')).rejects.toThrow(/can only have 5 radars/i);
    });

    it('should throw error when not authenticated', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null } });

      await expect(createRadar('New Radar')).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateRadar', () => {
    it('should update radar name', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: createMockRadar({ name: 'Updated Name' }),
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await updateRadar('radar-1', 'Updated Name');

      expect(result).toMatchObject({ id: 'radar-1', name: 'Updated Name' });
    });

    it('should throw error when radar not found', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      await expect(updateRadar('nonexistent', 'New Name')).rejects.toThrow('Radar not found');
    });

    it('should validate name on update', async () => {
      await expect(updateRadar('radar-1', '')).rejects.toThrow('Radar name cannot be empty');
      await expect(updateRadar('radar-1', 'a'.repeat(51))).rejects.toThrow(
        'Radar name cannot exceed 50 characters'
      );
    });
  });

  describe('deleteRadar', () => {
    it('should delete a radar', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(deleteRadar('radar-1')).resolves.not.toThrow();
      expect(mockFrom).toHaveBeenCalledWith('radars');
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      });

      await expect(deleteRadar('radar-1')).rejects.toThrow('Failed to delete radar');
    });
  });

  describe('getRadarRepos', () => {
    it('should fetch repos in a radar', async () => {
      const mockRepos = [
        createMockRadarRepo(),
        createMockRadarRepo({ id: 'repo-2', github_repo_id: 67890 }),
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockRepos, error: null }),
          }),
        }),
      });

      const result = await getRadarRepos('radar-1');

      expect(mockFrom).toHaveBeenCalledWith('radar_repos');
      expect(result).toHaveLength(2);
      expect(result[0].github_repo_id).toBe(12345);
    });
  });

  describe('addRepoToRadar', () => {
    it('should add a repo to a radar', async () => {
      // Mock radar repo count check (0 repos in radar)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      });

      // Mock total repos count check
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [{ radar_repos: [{ count: 5 }] }],
          error: null,
        }),
      });

      // Mock insert
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createMockRadarRepo(), error: null }),
          }),
        }),
      });

      const result = await addRepoToRadar('radar-1', 12345);

      expect(result).toMatchObject({ radar_id: 'radar-1', github_repo_id: 12345 });
    });

    it('should throw error when radar has max repos', async () => {
      // Mock radar repo count check (at limit)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: RADAR_LIMITS.MAX_REPOS_PER_RADAR,
            error: null,
          }),
        }),
      });

      await expect(addRepoToRadar('radar-1', 12345)).rejects.toThrow(
        /already has 25 repositories/i
      );
    });

    it('should throw error when user has max total repos', async () => {
      // Mock radar repo count check (under limit)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      });

      // Mock total repos count check (at limit)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [{ radar_repos: [{ count: 25 }] }, { radar_repos: [{ count: 25 }] }],
          error: null,
        }),
      });

      await expect(addRepoToRadar('radar-1', 12345)).rejects.toThrow(/limit of 50 total/i);
    });

    it('should throw error when repo already in radar', async () => {
      // Mock radar repo count check
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      });

      // Mock total repos count check
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [{ radar_repos: [{ count: 5 }] }],
          error: null,
        }),
      });

      // Mock insert with unique constraint violation
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505' },
            }),
          }),
        }),
      });

      await expect(addRepoToRadar('radar-1', 12345)).rejects.toThrow(
        'This repository is already in this radar'
      );
    });
  });

  describe('removeRepoFromRadar', () => {
    it('should remove a repo from a radar', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      await expect(removeRepoFromRadar('radar-1', 12345)).resolves.not.toThrow();
      expect(mockFrom).toHaveBeenCalledWith('radar_repos');
    });
  });

  describe('getAllRadarRepoIds', () => {
    it('should return all repo IDs across radars', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ github_repo_id: 111 }, { github_repo_id: 222 }, { github_repo_id: 333 }],
          error: null,
        }),
      });

      const result = await getAllRadarRepoIds();

      expect(mockFrom).toHaveBeenCalledWith('radar_repos');
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      expect(result.has(111)).toBe(true);
      expect(result.has(222)).toBe(true);
      expect(result.has(333)).toBe(true);
    });
  });

  describe('getRadarsContainingRepo', () => {
    it('should return radar IDs containing a repo', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ radar_id: 'radar-1' }, { radar_id: 'radar-2' }],
            error: null,
          }),
        }),
      });

      const result = await getRadarsContainingRepo(12345);

      expect(result).toEqual(['radar-1', 'radar-2']);
    });

    it('should return empty array when repo not in any radar', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getRadarsContainingRepo(99999);

      expect(result).toEqual([]);
    });
  });
});
