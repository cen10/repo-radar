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
