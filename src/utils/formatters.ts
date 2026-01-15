/**
 * Formatting utilities for dates, numbers, and display values.
 */

import { logger } from './logger';

/**
 * Format relative time (e.g., "2 days ago")
 * Handles various time intervals from seconds to years
 * Explicitly handles invalid dates and future dates with logging
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  // Handle invalid dates
  if (isNaN(date.getTime())) {
    logger.warn('Invalid date string provided to formatRelativeTime', {
      dateString,
      context: 'formatRelativeTime',
    });
    return 'Invalid date';
  }

  // Handle future dates
  if (date > now) {
    logger.warn('Future date provided to formatRelativeTime', {
      dateString,
      date: date.toISOString(),
      now: now.toISOString(),
      context: 'formatRelativeTime',
    });
    return 'Invalid date';
  }

  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }
}

/**
 * Format a number with compact notation (e.g., 1.2k, 5.3M)
 *
 * @param value - The number to format
 * @returns Formatted string with compact notation
 *
 * @example
 * formatCompactNumber(1234)    // returns "1.2k"
 * formatCompactNumber(1234567) // returns "1.2M"
 * formatCompactNumber(500)     // returns "500"
 */
export function formatCompactNumber(value: number): string {
  if (value < 1000) {
    return value.toString();
  } else if (value < 1000000) {
    const thousands = value / 1000;
    const rounded = Math.round(thousands * 10) / 10;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}k`;
  } else {
    const millions = value / 1000000;
    const rounded = Math.round(millions * 10) / 10;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M`;
  }
}

/**
 * Format a growth rate as a percentage string with sign
 *
 * @param rate - Growth rate as decimal (0.25 = 25%), or null if no baseline
 * @param decimals - Number of decimal places (default: 0)
 * @param absoluteGain - Absolute stars gained, used when rate is null
 * @returns Formatted percentage string with sign (e.g., "+25%", "-10%")
 *
 * Note: When rate is null (no baseline to calculate from), we display the absolute
 * gain instead. In practice, this branch is unlikely to execute for "hot" repos
 * because isHotRepo() requires minimum thresholds (100+ stars, 50+ gained) that
 * filter out repos with no history. This exists as a safeguard for edge cases
 * or if the growth rate is displayed in other contexts without those filters.
 *
 * @example
 * formatGrowthRate(0.25)           // returns "+25%"
 * formatGrowthRate(-0.1)           // returns "-10%"
 * formatGrowthRate(0)              // returns "0%"
 * formatGrowthRate(0.256, 1)       // returns "+25.6%"
 * formatGrowthRate(null, 0, 50)    // returns "+50 stars"
 */
export function formatGrowthRate(
  rate: number | null,
  decimals: number = 0,
  absoluteGain?: number
): string {
  // No baseline to calculate percentage - show absolute gain instead
  if (rate === null) {
    if (absoluteGain !== undefined) {
      return absoluteGain >= 0 ? `+${absoluteGain} stars` : `${absoluteGain} stars`;
    }
    return 'New';
  }

  const percentage = rate * 100;
  const formatted = percentage.toFixed(decimals);
  if (rate > 0) {
    return `+${formatted}%`;
  } else if (rate < 0) {
    return `${formatted}%`; // Negative sign is already included
  } else {
    return '0%';
  }
}

/**
 * Format a date as a short localized date string
 *
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Jan 15, 2025")
 *
 * @example
 * formatShortDate('2025-01-15T12:00:00Z') // returns "Jan 15, 2025"
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    logger.warn('Invalid date string provided to formatShortDate', {
      dateString,
      context: 'formatShortDate',
    });
    return 'Invalid date';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
