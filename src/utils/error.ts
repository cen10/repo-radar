/**
 * Helper function to extract error message with fallback
 * @param error - The error object to extract message from
 * @param defaultMessage - The default message to use if error message is empty
 * @returns The error message or default message
 */
export function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error && error.message?.trim() !== '') {
    return error.message;
  }
  return defaultMessage;
}
