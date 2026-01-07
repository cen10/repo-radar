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
6. **Tailwind v3 syntax**: Use canonical v3 class names, not legacy v2 names (e.g., `shrink-0` not `flex-shrink-0`, `grow` not `flex-grow`)
7. **Unused parameters**: Prefix unused function parameters with `_` to avoid ESLint warnings (e.g., `{ error: _error, resetErrorBoundary }`)
8. **Testing text content**: Use partial, case-insensitive regex for text assertions rather than exact string matches (e.g., `screen.getByText(/something went wrong/i)` instead of `screen.getByText('Something went wrong...')`)
9. **Testing interactive elements**: Use `getByRole` for buttons/links with partial name matching (e.g., `screen.getByRole('button', { name: /try again/i })`)
10. **Test user-facing behavior**: Focus on user-facing meaning, not implementation details like HTML structure or exact copy that may change
11. **Vitest globals**: Keep `globals: false` in vitest config for explicit imports best practice - always import `{ expect, describe, it }` from 'vitest' in test files. Use `'@testing-library/jest-dom/vitest'` import for jest-dom matchers.
12. **Type-safe test mocks**: Prefer typed approaches over `as any`, but choose based on context:
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

## Accessibility Patterns

### Hidden Labels for Form Inputs

Use `aria-hidden="true"` on visually hidden labels to prevent double announcements:

```html
<label for="input-id" class="sr-only" aria-hidden="true">
  Input Label Text
</label>
<input id="input-id" aria-label="Input Label Text" />
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
  <a href="/repo" className="block">
    {/* Card content */}
  </a>
  <button className="absolute top-2 right-2">
    Follow
  </button>
</div>
```

## Trending Criteria

A repository is "trending" if it meets ALL of:

1. Has ≥100 stars total
2. Grows ≥25% in 24 hours
3. Gains ≥50 stars in that same 24-hour period

## Commit Message Rules

- Title ≤ 50 chars, imperative ("Fix…", not "Fixed…")
- Body: wrap at 72 chars; explain the _why_

## Environment Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

