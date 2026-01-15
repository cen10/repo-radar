import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import {
  formatRelativeTime,
  formatCompactNumber,
  formatGrowthRate,
  formatShortDate,
} from './formatters';
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

describe('formatters', () => {
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

  describe('formatCompactNumber', () => {
    it('returns number as-is for values under 1000', () => {
      expect(formatCompactNumber(0)).toBe('0');
      expect(formatCompactNumber(1)).toBe('1');
      expect(formatCompactNumber(500)).toBe('500');
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('formats thousands with k suffix', () => {
      expect(formatCompactNumber(1000)).toBe('1k');
      expect(formatCompactNumber(1234)).toBe('1.2k');
      expect(formatCompactNumber(1500)).toBe('1.5k');
      expect(formatCompactNumber(10000)).toBe('10k');
      expect(formatCompactNumber(99999)).toBe('100k');
      expect(formatCompactNumber(999999)).toBe('1000k');
    });

    it('formats millions with M suffix', () => {
      expect(formatCompactNumber(1000000)).toBe('1M');
      expect(formatCompactNumber(1234567)).toBe('1.2M');
      expect(formatCompactNumber(5500000)).toBe('5.5M');
      expect(formatCompactNumber(10000000)).toBe('10M');
    });

    it('omits decimal when not needed', () => {
      expect(formatCompactNumber(1000)).toBe('1k');
      expect(formatCompactNumber(2000)).toBe('2k');
      expect(formatCompactNumber(1000000)).toBe('1M');
    });
  });

  describe('formatGrowthRate', () => {
    it('formats positive growth with plus sign', () => {
      expect(formatGrowthRate(0.25)).toBe('+25%');
      expect(formatGrowthRate(0.5)).toBe('+50%');
      expect(formatGrowthRate(1.0)).toBe('+100%');
      expect(formatGrowthRate(0.01)).toBe('+1%');
    });

    it('formats negative growth with minus sign', () => {
      expect(formatGrowthRate(-0.1)).toBe('-10%');
      expect(formatGrowthRate(-0.25)).toBe('-25%');
      expect(formatGrowthRate(-0.5)).toBe('-50%');
    });

    it('formats zero growth without sign', () => {
      expect(formatGrowthRate(0)).toBe('0%');
    });

    it('supports decimal places parameter', () => {
      expect(formatGrowthRate(0.256, 1)).toBe('+25.6%');
      expect(formatGrowthRate(0.2567, 2)).toBe('+25.67%');
      expect(formatGrowthRate(-0.123, 1)).toBe('-12.3%');
    });

    it('rounds when decimal places are limited', () => {
      expect(formatGrowthRate(0.256)).toBe('+26%');
      expect(formatGrowthRate(0.254)).toBe('+25%');
    });
  });

  describe('formatShortDate', () => {
    it('formats dates in short format', () => {
      expect(formatShortDate('2025-01-15T12:00:00Z')).toBe('Jan 15, 2025');
      expect(formatShortDate('2023-06-01T00:00:00Z')).toBe('Jun 1, 2023');
      expect(formatShortDate('2024-12-25T18:30:00Z')).toBe('Dec 25, 2024');
    });

    it('handles invalid date strings', () => {
      vi.clearAllMocks();
      const result = formatShortDate('invalid-date');

      expect(result).toBe('Invalid date');
      expect(logger.warn).toHaveBeenCalledWith('Invalid date string provided to formatShortDate', {
        dateString: 'invalid-date',
        context: 'formatShortDate',
      });
    });

    it('handles empty strings', () => {
      vi.clearAllMocks();
      const result = formatShortDate('');

      expect(result).toBe('Invalid date');
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
