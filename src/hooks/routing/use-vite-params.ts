import { useParams } from 'react-router-dom';

/**
 * Safely get route params for Vite/React Router.
 *
 * In Vite, this returns the current route params via react-router-dom's useParams.
 * In Next.js (when isNextJs is true), this returns an empty object because
 * react-router-dom context doesn't exist.
 *
 * NOTE: We always call useParams to satisfy the rules of hooks (no conditional hook calls).
 * The isNextJs check only affects what we return, not whether the hook is called.
 * useParams safely returns empty object when there's no Router context (it won't throw).
 */
export function useViteParams(isNextJs: boolean): Record<string, string> {
  // Always call useParams to satisfy rules of hooks.
  // In Vite, this gets the matched route params.
  // In Next.js, there's no react-router Router context, but useParams returns {} instead of throwing.
  const params = useParams();

  // In Next.js, ignore react-router params (they're meaningless without context)
  if (isNextJs) {
    return {};
  }

  return params as Record<string, string>;
}
