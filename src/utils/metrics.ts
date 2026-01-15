/**
 * Metrics calculation utilities for repository growth and trending detection.
 *
 * These functions perform pure calculations on numeric inputs.
 * Historical data storage and retrieval is handled elsewhere (services/database).
 */

// Thresholds for "hot" repository classification (from spec)
// A repo is "hot" when ALL three criteria are met
export const HOT_REPO_MIN_STARS = 100;
export const HOT_REPO_MIN_GROWTH_RATE = 0.25; // 25% as decimal
export const HOT_REPO_MIN_STARS_GAINED = 50;

/**
 * Calculate growth rate as a decimal (0.25 = 25% growth).
 *
 * @param current - Current value (e.g., today's star count)
 * @param previous - Previous value (e.g., yesterday's star count)
 * @returns Growth rate as decimal, or null if previous is 0 (can't calculate percentage from zero baseline)
 *
 * @example
 * calculateGrowthRate(125, 100) // returns 0.25 (25% growth)
 * calculateGrowthRate(80, 100)  // returns -0.2 (20% decline)
 * calculateGrowthRate(100, 0)   // returns null (no baseline to calculate from)
 */
export function calculateGrowthRate(current: number, previous: number): number | null {
  if (previous === 0) {
    // Can't calculate a percentage from zero - it's mathematically undefined.
    // Example: 0 → 100 stars is infinite % growth, not 0% or 100%.
    //
    // In practice, isHotRepo() requires 100+ total stars AND 50+ stars gained - so this
    // edge case is filtered out before display. This null return is a safeguard
    // in case growth rate is shown in other contexts without those filters.
    return null;
  }
  return (current - previous) / previous;
}

/**
 * Calculate absolute change between two values.
 *
 * @param current - Current value
 * @param previous - Previous value
 * @returns Absolute difference (positive for gains, negative for losses)
 *
 * @example
 * calculateStarsGained(150, 100) // returns 50
 * calculateStarsGained(80, 100)  // returns -20
 */
export function calculateStarsGained(current: number, previous: number): number {
  return current - previous;
}

/**
 * Determine if a repository qualifies as "hot" based on the spec criteria.
 *
 * A repo is "hot" when ALL of the following are true:
 * - Has at least 100 stars (HOT_REPO_MIN_STARS)
 * - Has at least 25% growth rate (HOT_REPO_MIN_GROWTH_RATE)
 * - Has gained at least 50 stars (HOT_REPO_MIN_STARS_GAINED)
 *
 * @param stars - Current star count
 * @param growthRate - Growth rate as decimal (0.25 = 25%)
 * @param starsGained - Absolute number of stars gained
 * @returns true if repo meets all "hot" criteria
 *
 * @example
 * isHotRepo(150, 0.30, 60) // returns true (all criteria met)
 * isHotRepo(50, 0.50, 25)  // returns false (not enough stars)
 * isHotRepo(200, 0.10, 20) // returns false (growth rate too low)
 */
export function isHotRepo(stars: number, growthRate: number, starsGained: number): boolean {
  return (
    stars >= HOT_REPO_MIN_STARS &&
    growthRate >= HOT_REPO_MIN_GROWTH_RATE &&
    starsGained >= HOT_REPO_MIN_STARS_GAINED
  );
}
