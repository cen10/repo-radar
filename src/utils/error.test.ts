import { describe, it, expect } from 'vitest';
import { getErrorMessage, isGitHubAuthError, GitHubReauthRequiredError } from './error';

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

describe('isGitHubAuthError', () => {
  it('returns true for GitHub authentication failed error', () => {
    const error = new Error('GitHub authentication failed. Please sign in again.');
    expect(isGitHubAuthError(error)).toBe(true);
  });

  it('returns true when error message contains GitHub authentication failed', () => {
    const error = new Error('Some prefix: GitHub authentication failed - suffix');
    expect(isGitHubAuthError(error)).toBe(true);
  });

  it('returns false for other errors', () => {
    const error = new Error('Network error');
    expect(isGitHubAuthError(error)).toBe(false);
  });

  it('returns false for rate limit errors', () => {
    const error = new Error('GitHub API rate limit exceeded');
    expect(isGitHubAuthError(error)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isGitHubAuthError(null)).toBe(false);
  });

  it('returns true for GitHubReauthRequiredError', () => {
    const error = new GitHubReauthRequiredError();
    expect(isGitHubAuthError(error)).toBe(true);
  });

  it('returns true for GitHubReauthRequiredError with custom message', () => {
    const error = new GitHubReauthRequiredError('Custom no token message');
    expect(isGitHubAuthError(error)).toBe(true);
  });
});
