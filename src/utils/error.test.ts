import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './error';

describe('getErrorMessage', () => {
  const defaultMessage = 'Default error message';

  it('returns error message when error is an Error instance with message', () => {
    const error = new Error('Custom error message');
    expect(getErrorMessage(error, defaultMessage)).toBe('Custom error message');
  });

  it('returns default message when error is an Error with empty message', () => {
    const error = new Error('');
    expect(getErrorMessage(error, defaultMessage)).toBe(defaultMessage);
  });

  it('returns default message when error is an Error with whitespace-only message', () => {
    const error = new Error('   ');
    expect(getErrorMessage(error, defaultMessage)).toBe(defaultMessage);
  });

  it('returns default message when error is null', () => {
    expect(getErrorMessage(null, defaultMessage)).toBe(defaultMessage);
  });

  it('returns default message when error is undefined', () => {
    expect(getErrorMessage(undefined, defaultMessage)).toBe(defaultMessage);
  });

  it('returns default message when error is a string', () => {
    expect(getErrorMessage('string error', defaultMessage)).toBe(defaultMessage);
  });

  it('returns default message when error is an object without Error prototype', () => {
    const error = { message: 'not an error instance' };
    expect(getErrorMessage(error, defaultMessage)).toBe(defaultMessage);
  });

  it('returns default message when error is a number', () => {
    expect(getErrorMessage(42, defaultMessage)).toBe(defaultMessage);
  });

  it('returns default message when error is a boolean', () => {
    expect(getErrorMessage(false, defaultMessage)).toBe(defaultMessage);
  });
});
