import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime } from './relativeTime';
import { logger } from './logger';

// Mock the logger to silence test output
vi.mock('./logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current time to make tests deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-12-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('valid recent times', () => {
    it('returns "just now" for times within 60 seconds', () => {
      const thirtySecondsAgo = new Date('2023-12-01T11:59:30Z').toISOString();
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
    });

    it('returns "just now" for times exactly at the boundary (59 seconds)', () => {
      const fiftyNineSecondsAgo = new Date('2023-12-01T11:59:01Z').toISOString();
      expect(formatRelativeTime(fiftyNineSecondsAgo)).toBe('just now');
    });
  });

  describe('minutes ago', () => {
    it('returns singular "1 minute ago" for exactly 1 minute', () => {
      const oneMinuteAgo = new Date('2023-12-01T11:59:00Z').toISOString();
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('returns plural "minutes ago" for multiple minutes', () => {
      const fiveMinutesAgo = new Date('2023-12-01T11:55:00Z').toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('returns "59 minutes ago" at the boundary before hours', () => {
      const fiftyNineMinutesAgo = new Date('2023-12-01T11:01:00Z').toISOString();
      expect(formatRelativeTime(fiftyNineMinutesAgo)).toBe('59 minutes ago');
    });
  });

  describe('hours ago', () => {
    it('returns singular "1 hour ago" for exactly 1 hour', () => {
      const oneHourAgo = new Date('2023-12-01T11:00:00Z').toISOString();
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('returns plural "hours ago" for multiple hours', () => {
      const fiveHoursAgo = new Date('2023-12-01T07:00:00Z').toISOString();
      expect(formatRelativeTime(fiveHoursAgo)).toBe('5 hours ago');
    });

    it('returns "23 hours ago" at the boundary before days', () => {
      const twentyThreeHoursAgo = new Date('2023-11-30T13:00:00Z').toISOString();
      expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23 hours ago');
    });
  });

  describe('days ago', () => {
    it('returns singular "1 day ago" for exactly 1 day', () => {
      const oneDayAgo = new Date('2023-11-30T12:00:00Z').toISOString();
      expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
    });

    it('returns plural "days ago" for multiple days', () => {
      const fiveDaysAgo = new Date('2023-11-26T12:00:00Z').toISOString();
      expect(formatRelativeTime(fiveDaysAgo)).toBe('5 days ago');
    });

    it('returns "29 days ago" at the boundary before months', () => {
      const twentyNineDaysAgo = new Date('2023-11-02T12:00:00Z').toISOString();
      expect(formatRelativeTime(twentyNineDaysAgo)).toBe('29 days ago');
    });
  });

  describe('months ago', () => {
    it('returns singular "1 month ago" for exactly 30 days', () => {
      const thirtyDaysAgo = new Date('2023-11-01T12:00:00Z').toISOString();
      expect(formatRelativeTime(thirtyDaysAgo)).toBe('1 month ago');
    });

    it('returns plural "months ago" for multiple months', () => {
      const sixMonthsAgo = new Date('2023-06-01T12:00:00Z').toISOString();
      expect(formatRelativeTime(sixMonthsAgo)).toBe('6 months ago');
    });

    it('returns "11 months ago" at the boundary before years', () => {
      const elevenMonthsAgo = new Date('2023-01-02T12:00:00Z').toISOString();
      expect(formatRelativeTime(elevenMonthsAgo)).toBe('11 months ago');
    });
  });

  describe('years ago', () => {
    it('returns singular "1 year ago" for exactly 365 days', () => {
      const oneYearAgo = new Date('2022-12-01T12:00:00Z').toISOString();
      expect(formatRelativeTime(oneYearAgo)).toBe('1 year ago');
    });

    it('returns plural "years ago" for multiple years', () => {
      const threeYearsAgo = new Date('2020-12-01T12:00:00Z').toISOString();
      expect(formatRelativeTime(threeYearsAgo)).toBe('3 years ago');
    });
  });

  describe('error handling', () => {
    it('handles invalid date strings and logs warning', () => {
      const result = formatRelativeTime('invalid-date');

      expect(result).toBe('Invalid date');
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid date string provided to formatRelativeTime',
        {
          dateString: 'invalid-date',
          context: 'formatRelativeTime',
        }
      );
    });

    it('handles empty strings and logs warning', () => {
      const result = formatRelativeTime('');

      expect(result).toBe('Invalid date');
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid date string provided to formatRelativeTime',
        {
          dateString: '',
          context: 'formatRelativeTime',
        }
      );
    });

    it('handles future dates and logs warning', () => {
      const futureDate = new Date('2023-12-01T13:00:00Z').toISOString();
      const result = formatRelativeTime(futureDate);

      expect(result).toBe('Invalid date');
      expect(logger.warn).toHaveBeenCalledWith('Future date provided to formatRelativeTime', {
        dateString: futureDate,
        date: futureDate,
        now: '2023-12-01T12:00:00.000Z',
        context: 'formatRelativeTime',
      });
    });

    it('handles malformed ISO strings', () => {
      const result = formatRelativeTime('2023-13-45T25:70:80Z');

      expect(result).toBe('Invalid date');
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid date string provided to formatRelativeTime',
        {
          dateString: '2023-13-45T25:70:80Z',
          context: 'formatRelativeTime',
        }
      );
    });
  });

  describe('edge cases', () => {
    it('handles dates exactly at boundary transitions', () => {
      // Exactly 60 seconds ago (should be 1 minute ago)
      const exactlyOneMinute = new Date('2023-12-01T11:59:00.000Z').toISOString();
      expect(formatRelativeTime(exactlyOneMinute)).toBe('1 minute ago');

      // Exactly 3600 seconds ago (should be 1 hour ago)
      const exactlyOneHour = new Date('2023-12-01T11:00:00.000Z').toISOString();
      expect(formatRelativeTime(exactlyOneHour)).toBe('1 hour ago');

      // Exactly 86400 seconds ago (should be 1 day ago)
      const exactlyOneDay = new Date('2023-11-30T12:00:00.000Z').toISOString();
      expect(formatRelativeTime(exactlyOneDay)).toBe('1 day ago');
    });

    it('handles leap year calculations', () => {
      // Set time to a leap year
      vi.setSystemTime(new Date('2024-03-01T12:00:00Z'));

      const oneYearAgo = new Date('2023-03-01T12:00:00Z').toISOString();
      expect(formatRelativeTime(oneYearAgo)).toBe('1 year ago');
    });

    it('handles daylight saving time transitions', () => {
      // Set time after DST change
      vi.setSystemTime(new Date('2023-11-05T12:00:00Z'));

      const beforeDST = new Date('2023-11-04T12:00:00Z').toISOString();
      expect(formatRelativeTime(beforeDST)).toBe('1 day ago');
    });
  });

  describe('real-world GitHub timestamp formats', () => {
    it('handles typical GitHub API timestamp format', () => {
      const githubTimestamp = '2023-11-30T12:34:56Z';
      expect(formatRelativeTime(githubTimestamp)).toBe('23 hours ago');
    });

    it('handles timestamp with milliseconds', () => {
      const timestampWithMs = '2023-12-01T11:30:00.123Z';
      expect(formatRelativeTime(timestampWithMs)).toBe('29 minutes ago');
    });

    it('handles local timezone timestamps', () => {
      const localTimestamp = '2023-12-01T07:00:00-05:00'; // EST, equivalent to 12:00:00Z
      expect(formatRelativeTime(localTimestamp)).toBe('just now');
    });
  });
});
