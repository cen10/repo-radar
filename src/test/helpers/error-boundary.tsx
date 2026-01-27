/**
 * Test component that conditionally throws an error.
 * Useful for testing ErrorBoundary components.
 */
export function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No Error</div>;
}
