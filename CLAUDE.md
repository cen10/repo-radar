# Claude Code Context for Repo Radar

## Project Overview

GitHub Repository Momentum Dashboard - Track star growth, releases, and issue activity across starred repositories.

## Tech Stack

### Frontend

- **Framework**: React 18 with Vite 5
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS v3 with Headless UI
- **State Management**: TanStack Query (React Query)
- **Charts**: Chart.js with react-chartjs-2
- **Routing**: React Router v6

### Backend

- **Runtime**: Node.js 20.x
- **Functions**: Vercel/Netlify Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with GitHub OAuth
- **API**: RESTful endpoints

### Testing

- **Unit/Integration**: React Testing Library
- **E2E**: Playwright
- **Linting**: ESLint
- **Formatting**: Prettier

## Project Structure

```
src/
  components/       # React components
  pages/           # Route pages
  hooks/           # Custom React hooks
  services/        # API clients
  utils/           # Utility functions
  types/           # TypeScript interfaces
api/              # Serverless functions
tests/            # All test files
```

## Key Commands

```bash
npm run dev          # Start development server
npm run test         # Run tests
npm run lint         # Lint code
npm run build        # Build for production
```

## Key Decisions

- Using Supabase RLS for data isolation
- GitHub OAuth App (not GitHub App) for simplicity
- Stale-while-revalidate caching strategy
- Mobile-first responsive design
- Soft delete with 30-day recovery window

## Performance Targets

- Initial load: < 3 seconds
- Interaction response: < 200ms
- Support 500 starred repos per user
- 60 FPS animations

## Important Constraints

- GitHub API rate limit: 5000 req/hour authenticated
- Data retention: 90 days
- Pagination: 100 repos per page
- Hourly data refresh cycle

## Development Guidelines

1. Follow TDD: Write tests first
2. Use TypeScript strict mode
3. Maintain >80% test coverage
4. Implement accessibility (WCAG 2.1 AA)
5. Progressive enhancement approach
6. **Task branching**: Create feature branches from main using pattern: `t{task-number}-{brief-description}` (e.g., `git checkout -b t014-repo-card-component`)
7. **Task tracking**: Update `/specs/001-develop-a-personalized/tasks.md` when completing tasks
8. **Knowledge capture**: When solving problems that took significant time, established new patterns, or involved architecture decisions, suggest adding the solution to this file. Focus on practical knowledge with code examples, not general advice.
9. **Tailwind v3 syntax**: Use canonical v3 class names, not legacy v2 names (e.g., `shrink-0` not `flex-shrink-0`, `grow` not `flex-grow`)
10. **Unused parameters**: Prefix unused function parameters with `_` to avoid ESLint warnings (e.g., `{ error: _error, resetErrorBoundary }`)
11. **Testing text content**: Use partial, case-insensitive regex for text assertions rather than exact string matches (e.g., `screen.getByText(/something went wrong/i)` instead of `screen.getByText('Something went wrong...')`)
12. **Testing interactive elements**: Use `getByRole` for buttons/links with partial name matching (e.g., `screen.getByRole('button', { name: /try again/i })`)
13. **Test user-facing behavior**: Focus on user-facing meaning, not implementation details like HTML structure or exact copy that may change
14. **Vitest globals**: Keep `globals: false` in vitest config for explicit imports best practice - always import `{ expect, describe, it }` from 'vitest' in test files. Use `'@testing-library/jest-dom/vitest'` import for jest-dom matchers.
15. **Type-safe test mocks**: Prefer typed approaches over `as any`, but choose based on context:
    - **Simple object mocks**: Use `Partial<T>` for type safety without complexity

      `error: { message: 'test' } as Partial<AuthError>`

    - **Real constructors**: Use when they're simple AND you need real instances

      `error: new AuthError('test');`

    - **`as any` with eslint-disable**: Use sparingly when mock complexity outweighs type safety benefits

      `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
      `error: { complex: 'mock' } as any`

    - Avoid creating helper functions just to wrap constructors - keep tests simple.

## Testing Best Practices

### Logger Mocking Pattern

To prevent stderr noise in tests, always mock the logger module in test files:

```typescript
import { logger } from '../utils/logger';

// Mock the logger to silence test output
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));
```

Apply this pattern in any test file that uses the logger or tests components that internally use the logger.

### React Query Cache Invalidation Testing

When testing actions that modify data and should invalidate caches (e.g., star/unstar, create/delete), always verify that ALL relevant query caches are invalidated. Missing cache invalidations cause stale UI state.

```typescript
// Create queryClient outside render so you can spy on it
const queryClient = createTestQueryClient();
const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

// Pass queryClient to render helper
renderWithProviders(<Component />, queryClient);

// After triggering the action, verify ALL caches are invalidated
await waitFor(() => {
  expect(invalidateQueriesSpy).toHaveBeenCalledWith({
    queryKey: ['primaryCache'],
  });
  expect(invalidateQueriesSpy).toHaveBeenCalledWith({
    queryKey: ['secondaryCache'], // Don't forget related caches!
  });
});
```

Key points:
- Test from different UI contexts (e.g., action from search results vs. main list)
- Clear the spy before the action to isolate assertions: `invalidateQueriesSpy.mockClear()`
- Consider all query keys that contain the modified data

## Accessibility Patterns

### Hidden Labels for Form Inputs

Use `aria-hidden="true"` on visually hidden labels to prevent double announcements:

```html
<label htmlFor="input-id" className="sr-only" aria-hidden="true"> Input Label Text </label>
<input id="input-id" type="text" placeholder="Visible placeholder..." />
```

The label still provides the accessible name via `htmlFor`/`id` connection, but VoiceOver won't announce it as a separate navigation stop.

### JSX Text Nodes for Screen Readers

Screen readers navigate between separate text nodes individually. Use template literals to create single text nodes:

```jsx
// BAD: Multiple text nodes, choppy navigation
<p>Welcome {username}, you have {count} messages</p>

// GOOD: Single text node, smooth navigation
<p>{`Welcome ${username}, you have ${count} messages`}</p>
```

### Nested Interactive Elements

Never nest buttons inside links—it's invalid HTML and causes unpredictable screen reader behavior. Use siblings instead:

```jsx
<div className="relative">
  <a href={url} className="block p-6">
    {/* Card content */}
  </a>
  <button className="absolute top-6 right-6">Follow</button>
</div>
```

## Data Validation Pattern

1. **Validate at the call site, not inside the function.** If a function requires certain data to exist (like `user_name`), check for that data before calling the function. If it's missing, handle the error right there — don't call the function at all.
2. **Keep mapping/transformation functions pure.** A function like `mapXToY` should only map data. It should not validate inputs, throw errors, or have side effects. It trusts that the caller has already ensured the data is valid.
3. **Don't pass derived values as extra parameters.** If you can derive a value from an object you're already passing (e.g., `login` from `supabaseUser.user_metadata.user_name`), don't pass both the object and the derived value. Just pass the object and let the function extract what it needs.
4. **Handle errors where you have context.** The call site knows what error message to show, what state to update, etc. Don't bury error handling inside utility functions that lack that context.

```typescript
// ✓ Good: Validate first, then call
if (!data.requiredField) {
  handleError();
  return;
}
const result = mapData(data);

// ✗ Bad: Let the function throw and catch it
try {
  const result = mapData(data); // throws if requiredField missing
} catch (err) {
  handleError();
}

// ✗ Bad: Pass derived values as extra params
const result = mapData(data, data.requiredField);
```

## Commit Message Rules

- Title ≤ 50 chars, imperative ("Fix…", not "Fixed…")
- Body: wrap at 72 chars; explain the _why_
- **Avoid force pushes**: Don't amend commits that have been pushed. Create new commits instead.

## Environment Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```
