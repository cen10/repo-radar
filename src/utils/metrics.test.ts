import { describe, it, expect } from 'vitest';
import {
  calculateGrowthRate,
  calculateStarsGained,
  isHotRepo,
  HOT_REPO_MIN_STARS,
  HOT_REPO_MIN_GROWTH_RATE,
  HOT_REPO_MIN_STARS_GAINED,
} from './metrics';

describe('metrics utilities', () => {
  describe('calculateGrowthRate', () => {
    it('calculates positive growth rate correctly', () => {
      expect(calculateGrowthRate(125, 100)).toBe(0.25);
      expect(calculateGrowthRate(200, 100)).toBe(1.0);
      expect(calculateGrowthRate(110, 100)).toBeCloseTo(0.1);
    });

    it('calculates negative growth rate correctly', () => {
      expect(calculateGrowthRate(80, 100)).toBe(-0.2);
      expect(calculateGrowthRate(50, 100)).toBe(-0.5);
    });

    it('returns 0 when values are the same', () => {
      expect(calculateGrowthRate(100, 100)).toBe(0);
    });

    it('returns null when previous is 0 (no baseline to calculate from)', () => {
      expect(calculateGrowthRate(100, 0)).toBeNull();
      expect(calculateGrowthRate(0, 0)).toBeNull();
    });

    it('handles small decimal changes', () => {
      expect(calculateGrowthRate(101, 100)).toBeCloseTo(0.01);
      expect(calculateGrowthRate(99, 100)).toBeCloseTo(-0.01);
    });
  });

  describe('calculateStarsGained', () => {
    it('calculates positive gains correctly', () => {
      expect(calculateStarsGained(150, 100)).toBe(50);
      expect(calculateStarsGained(1000, 500)).toBe(500);
    });

    it('calculates negative gains (losses) correctly', () => {
      expect(calculateStarsGained(80, 100)).toBe(-20);
      expect(calculateStarsGained(0, 50)).toBe(-50);
    });

    it('returns 0 when values are the same', () => {
      expect(calculateStarsGained(100, 100)).toBe(0);
    });

    it('handles zero values', () => {
      expect(calculateStarsGained(50, 0)).toBe(50);
      expect(calculateStarsGained(0, 0)).toBe(0);
    });
  });

  describe('isHotRepo', () => {
    it('returns true when all criteria are met', () => {
      // Well above thresholds
      expect(isHotRepo(200, 0.5, 100)).toBe(true);
      // Exactly at thresholds
      expect(
        isHotRepo(HOT_REPO_MIN_STARS, HOT_REPO_MIN_GROWTH_RATE, HOT_REPO_MIN_STARS_GAINED)
      ).toBe(true);
    });

    it('returns false when stars are below threshold', () => {
      expect(isHotRepo(99, 0.5, 100)).toBe(false);
      expect(isHotRepo(0, 0.5, 100)).toBe(false);
    });

    it('returns false when growth rate is below threshold', () => {
      expect(isHotRepo(200, 0.24, 100)).toBe(false);
      expect(isHotRepo(200, 0, 100)).toBe(false);
      expect(isHotRepo(200, -0.1, 100)).toBe(false);
    });

    it('returns false when stars gained is below threshold', () => {
      expect(isHotRepo(200, 0.5, 49)).toBe(false);
      expect(isHotRepo(200, 0.5, 0)).toBe(false);
    });

    it('returns false when multiple criteria fail', () => {
      expect(isHotRepo(50, 0.1, 10)).toBe(false);
    });

    it('returns false when values are just below thresholds', () => {
      expect(isHotRepo(99, HOT_REPO_MIN_GROWTH_RATE, HOT_REPO_MIN_STARS_GAINED)).toBe(false);
      expect(isHotRepo(HOT_REPO_MIN_STARS, 0.249, HOT_REPO_MIN_STARS_GAINED)).toBe(false);
      expect(isHotRepo(HOT_REPO_MIN_STARS, HOT_REPO_MIN_GROWTH_RATE, 49)).toBe(false);
    });
  });

  describe('constants', () => {
    it('exports expected threshold values', () => {
      expect(HOT_REPO_MIN_STARS).toBe(100);
      expect(HOT_REPO_MIN_GROWTH_RATE).toBe(0.25);
      expect(HOT_REPO_MIN_STARS_GAINED).toBe(50);
    });
  });
});
