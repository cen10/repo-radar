# Claude Code Context for Repo Radar

## CRITICAL RULES - READ FIRST

**NEVER force push.** Do not use `git push --force`, `git push -f`, or `git push --force-with-lease`. If you've already pushed a commit and need to make changes, create a new commit instead of amending.

---

## Project Overview

GitHub Repository Momentum Dashboard - Track star growth, releases, and issue activity across starred repositories.

## Tech Stack

### Frontend

- **Framework**: React 19 with Vite 7
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS v4 with Headless UI
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v7

### Backend

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with GitHub OAuth
- **API**: GitHub REST API (client-side)

### Testing

- **Test Runner**: Vitest
- **Unit/Integration**: React Testing Library
- **E2E**: Playwright (chromium, firefox, webkit)
- **Linting**: ESLint
- **Formatting**: Prettier

## Project Structure

```
src/
  assets/          # Static assets
  components/      # React components (tests co-located)
  constants/       # Constants and error messages
  contexts/        # React contexts (auth)
  hooks/           # Custom React hooks
  pages/           # Route pages
  services/        # API clients
  test/            # Test setup and mocks
  types/           # TypeScript interfaces
  utils/           # Utility functions
specs/            # Feature specifications
```

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run unit/integration tests
npm run test:e2e     # Run Playwright E2E tests (headless)
npm run test:e2e:ui  # Run E2E with Playwright UI (debugging)
npm run test:e2e:headed  # Run E2E with visible browser
npm run typecheck    # TypeScript type checking
npm run lint         # Lint code
npm run lint:fix     # Lint and auto-fix
npm run format       # Format code with Prettier
npm run format:check # Check formatting
npm run schema:update  # Update GitHub API types from OpenAPI spec
```

### Multiple Worktrees / Port Conflicts

When running `npm run dev`, Vite auto-increments ports if 5173 is in use (5174, 5175, etc.). Always check the terminal output for the actual port:

```
Port 5173 is in use, trying another one...
  ➜  Local:   http://localhost:5174/
```

When using Playwright MCP to verify UI changes, navigate to the correct port from the dev server output.

## Key Decisions

- Using Supabase RLS for data isolation
- GitHub OAuth App (not GitHub App) for simplicity
- Stale-while-revalidate caching strategy
- Mobile-first responsive design
- Soft delete with 30-day recovery window

## State Management Architecture

**TanStack Query is used exclusively for server state** (remote data that needs caching). It wraps two data sources:

```
Component → TanStack Query hook → Service function → Data source
              (caching layer)       (API call)
```

| Hook                              | Data Source           | Service              |
| --------------------------------- | --------------------- | -------------------- |
| `useRadars`                       | Supabase (PostgreSQL) | `services/radar.ts`  |
| `useAllStarredRepositories`       | GitHub API            | `services/github.ts` |
| `usePaginatedStarredRepositories` | GitHub API            | `services/github.ts` |
| `useReleases`                     | GitHub API            | `services/github.ts` |
| `useInfiniteSearch`               | GitHub API            | `services/github.ts` |

**For local/UI state**, use React primitives:

- `useState` for component state (form inputs, modal open/close, UI toggles)
- `useContext` (e.g., `AuthContext`) for shared client state

**Not used**: TanStack Query for local-only state. Keep server state and client state separate.

### Cache Invalidation Strategy

**Rule: Always invalidate after mutations.** When using `setQueryData()` for optimistic updates during a write operation, always follow with `invalidateQueries()`. Optimistic-only updates are a bug waiting to happen - if the server rejects the write, the UI lies to the user with no mechanism to self-correct.

**Exception: Cache enrichment from read operations.** When you learn new information from a read-only API call (not a mutation), you can use `setQueryData()` without invalidation. Example: `useRepository.ts` discovers a repo is starred via `isRepositoryStarred()` (a GET request) and adds it to the `allStarredRepositories` cache. Invalidating here would be wrong - it would trigger a refetch that only returns the first 500 starred repos, potentially losing the repo we just added.

**Two patterns for mutations based on interaction type:**

1. **Inline interactions** (toggles, checkboxes) - Optimistic + Invalidate:
   ```typescript
   const handleToggle = async () => {
     const previousData = queryClient.getQueryData(queryKey);
     queryClient.setQueryData(queryKey, optimisticData); // Instant UI feedback
     try {
       await addRepoToRadar(radarId, repoId); // API call that can fail
       void queryClient.invalidateQueries({ queryKey }); // Sync with server
     } catch {
       queryClient.setQueryData(queryKey, previousData); // Rollback on error
     }
   };
   ```

2. **Modal/form submissions** (create, delete, rename) - Invalidate only:
   ```typescript
   const handleDelete = async () => {
     await deleteRadar(radarId); // Wait for server
     void queryClient.invalidateQueries({ queryKey }); // Then refresh
     onClose();
   };
   ```

**Why no optimistic updates for modals?** The rollback UX is worse than waiting. Imagine: user deletes something, modal closes, toast shows success, then rollback causes it to reappear. You're paying complexity tax for a scenario where rollback is confusing. Better to show a brief loading state.

**Cache key granularity:** `invalidateQueries({ queryKey: ['radars'] })` invalidates all queries with that prefix, not just exact matches. If you only want to invalidate a specific radar, use `['radar', radarId]`.

**Never use separate `useState` for optimistic state.** The cache _is_ the state - use `setQueryData()` directly:

```typescript
// ✗ Bad: Two sources of truth
const [optimisticData, setOptimisticData] = useState(null);
const effectiveData = optimisticData ?? serverData;

// ✓ Good: Cache is the single source of truth
queryClient.setQueryData(queryKey, optimisticData);
```

## Performance Targets

- Initial load: < 3 seconds
- Interaction response: < 200ms
- Support 500 starred repos per user
- 60 FPS animations

## Important Constraints

- GitHub API rate limit: 5000 req/hour authenticated
- Data retention: 90 days
- Pagination: 100 repos per page
- Daily data refresh cycle (hourly doesn't scale with GitHub API limits)

## Performance Debugging

Console violations like `[Violation] 'setTimeout' handler took Xms` in dev mode are often caused by React's development overhead (`jsxDEV`, `createTask`, React DevTools instrumentation), not actual performance issues.

**Before optimizing:**

1. Run production build: `npm run build && npm run preview`
2. Preview server runs on **port 4173** (not 5173 which is dev)
3. If violations disappear in production, no action needed

**When to investigate:**

- Violations persist in production build
- PRs touching rendering-heavy code (lists, animations, complex components)

**Debugging tools:**

- Chrome DevTools → Performance tab → Record → look for "Long Task" markers
- Click on long tasks to see the call stack and identify the slow code

**To hide dev-mode violations:** In Chrome Console, filter with `-Violation`

## Development Guidelines

1. Follow TDD: Write tests first
2. Use TypeScript strict mode
3. Maintain >80% test coverage
4. Implement accessibility (WCAG 2.1 AA)
5. Progressive enhancement approach
6. **Task branching**: Create feature branches from main using pattern: `t{task-number}-{brief-description}` (e.g., `git checkout -b t014-repo-card-component`)
7. **Task tracking**: Update `/specs/001-develop-a-personalized/tasks.md` when completing tasks
8. **Knowledge capture**: When solving problems that took significant time, established new patterns, or involved architecture decisions, suggest adding the solution to this file. Focus on practical knowledge with code examples, not general advice.
9. **Tailwind v4 syntax**: Use canonical v4 class names (e.g., `shrink-0` not `flex-shrink-0`, `grow` not `flex-grow`)
10. **Conditional className with clsx**: Use `clsx` for combining conditional classes. Extract long class strings to named variables; keep short ones inline.

    ```tsx
    // Short strings: inline ternary is fine
    className={clsx('base-class', isActive ? 'text-blue-500' : 'text-gray-500')}

    // Long strings: extract to variables, use && pattern
    const navLinkBase = 'flex items-center py-2 text-sm font-medium transition-colors rounded-lg';
    const navLinkActive = 'bg-indigo-100 text-indigo-700';
    const navLinkInactive = 'text-gray-700 hover:bg-indigo-50';

    className={clsx(navLinkBase, isActive && navLinkActive, !isActive && navLinkInactive)}
    ```

    The goal is readability: don't add indirection for short strings, but do extract when inline strings would make the JSX hard to scan.
11. **Unused parameters**: Prefix unused function parameters with `_` to avoid ESLint warnings (e.g., `{ error: _error, resetErrorBoundary }`)
12. **Testing text content**: Use partial, case-insensitive regex for text assertions rather than exact string matches (e.g., `screen.getByText(/something went wrong/i)` instead of `screen.getByText('Something went wrong...')`)
13. **Testing interactive elements**: Use `getByRole` for buttons/links with partial name matching (e.g., `screen.getByRole('button', { name: /try again/i })`)
14. **Test user-facing behavior**: Focus on user-facing meaning, not implementation details like HTML structure or exact copy that may change
15. **Vitest globals**: Keep `globals: false` in vitest config for explicit imports best practice - always import `{ expect, describe, it }` from 'vitest' in test files. Use `'@testing-library/jest-dom/vitest'` import for jest-dom matchers.
16. **Production code over test convenience**: Never make production code decisions (like optional props, public methods, or loose types) just to make tests easier to write. Tests should adapt to production code, not the other way around.
17. **Type-safe test mocks**: Prefer typed approaches over `as any`, but choose based on context:
    - **Simple object mocks**: Use `Partial<T>` for type safety without complexity

      `error: { message: 'test' } as Partial<AuthError>`

    - **Real constructors**: Use when they're simple AND you need real instances

      `error: new AuthError('test');`

    - **`as any` with eslint-disable**: Use sparingly when mock complexity outweighs type safety benefits

      `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
      `error: { complex: 'mock' } as any`

    - Avoid creating helper functions just to wrap constructors - keep tests simple.

18. **Avoid eslint-disable comments**: Before using `eslint-disable-next-line`, always look for an alternative solution (e.g., using `_` prefix for unused params, restructuring code). If you determine `eslint-disable` is truly necessary, explicitly flag it to the user and explain why no alternative exists.
19. **Comment sparingly**: Don't add comments that merely restate what the code does - let well-named functions speak for themselves. Add comments only when explaining:
    - **Why** something is done a non-obvious way
    - **Tricky logic** that isn't self-evident (e.g., race condition guards, edge case handling)
    - **Workarounds** for bugs or limitations

    ```typescript
    // BAD: Comment restates what the function name already tells us
    // getValidGitHubToken handles null providerToken by falling back to localStorage
    const validToken = getValidGitHubToken(token);

    // GOOD: Comment explains non-obvious behavior
    // Guard against TanStack Query race condition where rapid pagination
    // can trigger duplicate fetches (see issue #6689)
    const isFetchingRef = useRef(false);
    ```

20. **Avoid deeply nested ternaries**: Never nest ternaries more than two levels. For conditional rendering with multiple states, use if-else in a render function:

    ```tsx
    // ✗ Bad: Deeply nested ternary
    {
      isLoading ? <Loading /> : error ? <Error /> : data.length === 0 ? <Empty /> : <List />;
    }

    // ✓ Good: Render function with if-else
    const renderContent = () => {
      if (isLoading) return <Loading />;
      if (error) return <Error />;
      if (data.length === 0) return <Empty />;
      return <List />;
    };
    ```

## Testing Best Practices

### Logger Mocking Pattern

The logger is mocked globally in `src/test/setup.ts`, so tests automatically have console output silenced. No boilerplate is needed for most test files.

**When you need to assert on logger calls**, import the mock:

```typescript
import { mockLogger, resetLoggerMock } from '../test/mocks/logger';

beforeEach(() => {
  resetLoggerMock(); // Start each test with clean mock
});

it('logs warning on invalid input', () => {
  doSomething();
  expect(mockLogger.warn).toHaveBeenCalledWith('message', expect.any(Object));
});
```

### React Query Cache Invalidation Testing

When testing actions that modify data and should invalidate caches (e.g., radar add/remove, create/delete), always verify that ALL relevant query caches are invalidated. Missing cache invalidations cause stale UI state.

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

### E2E Testing with Playwright

**CRITICAL: Always examine the actual UI before writing E2E tests.** Never write locators based on assumptions about what the DOM "should" look like.

**Required workflow for E2E test development:**

1. **Navigate to the page** - Start the dev server and open the page in a browser, or use Playwright MCP
2. **Capture the DOM structure** - Use `browser_snapshot` tool or browser devtools to see actual elements
3. **Identify real locators** - What roles, labels, and text actually exist? Don't assume `data-testid` or common patterns
4. **Write locators that match** - Use what you observed, not what you expected
5. **Run the test** - Verify it passes before committing

**E2E test files:**

- `e2e/` - Test specs and fixtures
- `e2e/pages/` - Page object models
- `e2e/fixtures/` - Playwright fixtures (auth, page objects, API mocks)
- Run with: `npm run test:e2e` or `npx playwright test`

### GitHub API Mocks for E2E Tests

E2E tests use fully mocked GitHub API responses - no real API calls are made. Mock data factories in `e2e/fixtures/github-mock-data.ts` use TypeScript types generated from GitHub's OpenAPI schema, ensuring type safety catches API drift at compile time.

**Key files:**

| File | Purpose |
|------|---------|
| `e2e/fixtures/github-mock-data.ts` | Mock data factories (repos, users, rate limits) |
| `e2e/fixtures/github.ts` | Playwright route mocks for GitHub API endpoints |
| `src/test/github-mock-data.test.ts` | Schema validation tests (Vitest) |
| `src/types/github-api.generated.ts` | TypeScript types from OpenAPI (generated) |

**Mocked endpoints:**

- `HEAD /user/starred` - Starred repo count via Link header (efficient, used by fetchStarredRepoCount)
- `GET /user/starred` - Starred repositories (paginated, with Link headers; also fallback for count)
- `GET /user/starred/:owner/:repo` - Check if repo is starred (204 = yes, 404 = no)
- `GET /repositories/:id` - Get repo by numeric ID (returns full-repository schema with subscribers_count)

**Updating types when GitHub API changes:**

```bash
npm run schema:update
```

This downloads the latest GitHub OpenAPI spec and regenerates TypeScript types. Run monthly or when noticing unexpected API behavior in production.

**If typecheck fails after schema update:**

1. Check which mock factory fields are causing errors
2. Update `e2e/fixtures/github-mock-data.ts` to match new schema
3. Add/remove/rename fields as required by the updated types
4. Run `npm run test` to verify schema validation tests still pass

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

## Pull Request Descriptions

PR descriptions should describe the **final state** of the code, not the journey to get there:

- **Do**: Describe what the PR accomplishes and why
- **Don't**: Narrate interim states or mention bugs that were introduced and fixed within the same PR
- **Do**: Note design decisions, tradeoffs, or alternatives considered if useful for reviewers
- **Don't**: Say "Fixed bug where X" if that bug was introduced earlier in the same PR branch
- **Don't**: Reference files in `docs/` — that directory is gitignored and stored separately, so reviewers can't see those files. Copy relevant reasoning directly into the PR description instead.

Useful sections to include:

- **Summary**: What changed and why (bullet points)
- **Design decisions**: Tradeoffs made, alternatives considered
- **Test plan**: How to verify the changes work
- **Notes for reviewers**: Tricky areas to pay attention to, or specific behaviors to verify

Example of what NOT to write:

> "Earlier commits used approach A, but we switched to approach B. Also fixed a bug where X was happening."

Instead write:

> "Uses approach B because [reason]. Alternative considered: approach A, but [why we didn't use it]."

## Environment Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```
