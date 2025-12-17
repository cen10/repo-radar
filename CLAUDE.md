# Claude Code Context for Repo Radar

## Project Overview
GitHub Repository Momentum Dashboard - Track star growth, releases, and issue activity across starred repositories.

## CRITICAL: Task Workflow
  **⚠️ ALWAYS follow this sequence when starting ANY 
  task:**

  1. **FIRST**: Check current branch (`git branch
  --show-current`)
  2. **IF NOT ON MAIN**:
     - Check for changes (`git status`). Ask the user if they would like to commit or stash any changes that exist.
     - Switch to main (`git checkout main`)
     - Pull latest (`git pull origin main`)
  3. **CREATE TASK BRANCH**: `git checkout -b
  t{task-number}-{brief-description}`
  4. **THEN**: Begin implementing the task
  5. Mark the task as complete in tasks.md when finished.
  

  **Never start work without creating a task branch 
  first!**

## Tech Stack

### Frontend
- **Framework**: React 18 with Vite 5
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS with Headless UI
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

## Current Implementation Status

### ✅ Completed
- Project setup and configuration
- Data model design
- API contract specification
- Technical research and decisions

### 🚧 In Progress
- Setting up development environment
- Implementing authentication flow

### 📋 Upcoming
- Repository list component
- Metrics visualization
- Follow/unfollow functionality
- Data sync implementation

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
6. Update `/specs/001-develop-a-personalized/tasks.md` when completing tasks
7. **Auto-format code**: Run `npm run format` after creating/editing any files to ensure consistent formatting
8. **Unused parameters**: Prefix unused function parameters with `_` to avoid ESLint warnings (e.g., `{ error: _error, resetErrorBoundary }`)
9. **Testing text content**: Use partial, case-insensitive regex for text assertions rather than exact string matches (e.g., `screen.getByText(/something went wrong/i)` instead of `screen.getByText('Something went wrong...')`)
10. **Testing interactive elements**: Use `getByRole` for buttons/links with partial name matching (e.g., `screen.getByRole('button', { name: /try again/i })`)
11. **Test user-facing behavior**: Focus on user-facing meaning, not implementation details like HTML structure or exact copy that may change
12. **Vitest globals**: Keep `globals: false` in vitest config for explicit imports best practice - always import `{ expect, describe, it }` from 'vitest' in test files. Use `'@testing-library/jest-dom/vitest'` import for jest-dom matchers.

## Data Validation Pattern

When validating data before processing:
1. **Validate at the call site, not inside the function.** If a function requires certain data to exist (like `user_name`), check for that data before calling the function. If it's missing, handle the error right there — don't call the function at all.
2. **Keep mapping/transformation functions pure.** A function like `mapXToY` should only map data. It should not validate inputs, throw errors, or have side effects. It trusts that the caller has already ensured the data is valid.
3. **Don't pass derived values as extra parameters.** If you can derive a value from an object you're already passing (e.g., `login` from `supabaseUser.user_metadata.user_name`), don't pass both the object and the derived value. Just pass the object and let the function extract what it needs.
4. **Handle errors where you have context.** The call site knows what error message to show, what state to update, etc. Don't bury error handling inside utility functions that lack that context.

Pattern to follow:
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

## Environment Variables
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

## Recent Changes
- Initial project structure created
- Supabase integration configured
- GitHub OAuth flow designed

---
*Auto-generated context for Claude Code. Last updated: 2025-09-15*