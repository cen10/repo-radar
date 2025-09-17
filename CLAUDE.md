# Claude Code Context for Repo Radar

## Project Overview
GitHub Repository Momentum Dashboard - Track star growth, releases, and issue activity across starred repositories.

## Current Working Branch
`001-develop-a-personalized`

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