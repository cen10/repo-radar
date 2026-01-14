# Implementation Plan: GitHub Repository Momentum Dashboard

**Branch**: `001-develop-a-personalized` | **Date**: 2025-09-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-develop-a-personalized/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Build a personalized GitHub repository momentum dashboard that consolidates star growth, release activity, and issue volume across starred repositories. The dashboard enables developers to spot trending projects and make informed decisions about tool adoption. Features direct GitHub star management with a "radar" system for organizing repositories to actively monitor. Technical approach uses React with Vite, TanStack Query for data fetching, Supabase for persistence, and serverless functions for periodic GitHub API syncing.

**Key UX Decisions** (see [ux-spec.md](./ux-spec.md) for details):
- Sidebar navigation with My Stars, Explore, and user-created Radars
- Radars are named collections (max 5 per user, 25 repos per radar, 50 total)
- Repository detail pages at `/repo/{github-id}`
- Collapsible search with ⌘K shortcut on My Stars and Radar views

## MVP Slices - Iterative Value Delivery

### 🛹 Slice 1: Static Dashboard (3-4 days)
**Value**: See all your starred repos in one place
- GitHub OAuth login
- Fetch and display user's starred repositories
- Show current star count for each repo
- Basic list view with repo name, owner, description
- Simple sorting (alphabetical, star count)

### 🛴 Slice 2: Live Metrics (2-3 days)
**Value**: See what's happening now with your repos
- Add current metrics: recent releases, open issues
- Calculate simple growth indicators (comparing to yesterday)
- Visual indicators for "hot" repos (≥100 stars + ≥25% growth in 24h + ≥50 stars gained)
- Manual refresh button
- Last updated timestamp

### 🚲 Slice 3: Navigation & Radar Feature (4-5 days)
**Value**: Organize repos you want to actively monitor
- Sidebar navigation with My Stars, Explore, and Radars
- Responsive layout (collapsible sidebar, mobile drawer)
- Radar CRUD: create, rename, delete radars (max 5)
- Add/remove repos to radars (max 25 per radar, 50 total)
- Radar dropdown on cards (desktop) / bottom sheet (mobile)
- Repository detail page at `/repo/{github-id}`
- Collapsible search with ⌘K on My Stars and Radar views
- Radar icon animation (sweep effect)
- Store radar data in Supabase with RLS

### 🏍️ Slice 4: Trend Detection (4-5 days)
**Value**: Spot trending repos automatically
- Start collecting historical data (hourly snapshots)
- 7-day trend calculation
- "Trending" section highlighting rapid growth
- Simple sparkline charts
- Sort by growth rate

### 🚗 Slice 5: Full Analytics (4-5 days)
**Value**: Deep insights into repository momentum
- 30-day historical charts (Chart.js)
- Detailed metrics view (expandable)
- Issue velocity tracking
- Release timeline
- Export data as CSV
- Account deletion

## Technical Context
**Language/Version**: TypeScript 5.x / Node.js 20.x
**Primary Dependencies**: React 18, Vite 5, TanStack Query, TailwindCSS, Supabase Client, Chart.js
**Storage**: Supabase PostgreSQL for user preferences and historical metrics
**Testing**: React Testing Library, Playwright for E2E tests
**Target Platform**: Progressive Web App, responsive design, mobile-first
**Project Type**: web - frontend React SPA + serverless backend functions
**Performance Goals**: < 3 second initial load, < 200ms interaction response, 60 FPS animations
**Constraints**: GitHub API rate limits (5000 req/hour authenticated), 90-day data retention, requires `public_repo` OAuth scope for star/unstar
**Scale/Scope**: Support up to 500 starred repos per user with efficient tag filtering, paginated at 100 items per view

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 2 (frontend app, serverless functions)
- Using framework directly? Yes - React, TailwindCSS, Supabase SDK used directly
- Single data model? Yes - shared TypeScript interfaces between frontend and functions
- Avoiding patterns? Yes - no unnecessary abstractions, direct API calls

**Architecture**:
- Modular architecture with clear separation of concerns
- Module organization:
  - `services/github` - GitHub API interactions
  - `utils/metrics` - Calculation and aggregation logic
  - `components/` - Reusable React components
- Simple folder structure, no separate packages
- Component documentation with JSDoc comments

**Testing**:
- Comprehensive test suite demonstrating testing knowledge
- Target >80% coverage for critical paths
- Test types: Unit tests for utilities, Integration for API, E2E for user flows
- Real dependencies used? Hybrid - unit tests mocked, integration tests use test database
- Key test areas: Authentication flow, data sync, metrics calculation
- Pragmatic approach: Write tests alongside implementation

**Observability**:
- Simple console logging for debugging
- Basic error handling with user-friendly messages
- Console errors in development, cleaned up for production
- Error boundaries for React components

**Versioning**:
- Version number assigned? 0.1.0 for MVP
- Semantic versioning for releases
- Simple version tracking in package.json

## Project Structure

### Documentation (this feature)
```
specs/001-develop-a-personalized/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

**Slice 1 Minimal Structure** (Start here):
```
src/
├── pages/
│   ├── Login.tsx
│   └── Dashboard.tsx
├── components/
│   ├── RepoCard.tsx
│   └── Header.tsx
├── services/
│   └── github.ts
└── types/
    └── index.ts

api/
├── auth.ts
└── starred.ts
```

**Full Structure** (Build incrementally):
```
src/
├── components/         # React components
│   ├── dashboard/     # Dashboard-specific components (Slice 3+)
│   ├── charts/        # Chart components (Slice 4+)
│   └── common/        # Shared UI components
├── pages/             # Route pages
├── hooks/             # Custom React hooks (Slice 2+)
├── services/          # API and external services
│   ├── github.ts     # GitHub API client
│   ├── supabase.ts   # Supabase client (Slice 3+)
│   └── api.ts        # Internal API calls
├── utils/             # Utility functions
│   ├── metrics.ts    # Metrics calculations (Slice 2+)
│   └── formatters.ts # Data formatters
├── types/             # TypeScript interfaces
└── constants/         # App constants

api/                    # Serverless functions
├── auth/              # GitHub OAuth handlers
├── sync/              # Data sync functions (Slice 4+)
└── repos/             # Repository endpoints

tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

**Structure Decision**: Simplified monorepo structure with clear module separation

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - Supabase Row Level Security for multi-tenant data
   - GitHub App vs OAuth App trade-offs (need `public_repo` scope for star/unstar)
   - GitHub API star/unstar endpoints and rate limit implications
   - Serverless function scheduling strategies
   - Chart.js vs alternatives for time-series visualization
   - Optimal caching strategy for GitHub API responses
   - Tag system performance with 500+ repositories

2. **Generate and dispatch research agents**:
   ```
   Task: "Research Supabase RLS patterns for user-specific data isolation"
   Task: "Research GitHub API star/unstar endpoints and OAuth scopes needed"
   Task: "Find best practices for GitHub API rate limit management"
   Task: "Research serverless cron patterns on Vercel/Netlify"
   Task: "Evaluate Chart.js performance with 500+ data points"
   Task: "Research React Query caching strategies for real-time updates"
   Task: "Research tag system database design for many-to-many relationships at scale"
   ```

3. **Consolidate findings** in `research.md`

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - User (GitHub auth)
   - Repository (GitHub data, metrics, star status)
   - Radar (user-created collections for monitoring)
   - RadarRepo (many-to-many relationship between radars and repos)
   - StarMetric (time-series star counts)
   - Release (version history)
   - IssueMetric (issue statistics)

2. **Generate API contracts** from functional requirements:
   - POST /api/auth/github - OAuth flow
   - GET /api/user/repos - Fetch starred repositories
   - GET /api/repos/:id/metrics - Get repository metrics
   - PUT /api/repos/:id/star - Star/unstar repository (syncs with GitHub)
   - GET /api/radars - Get user's radars
   - POST /api/radars - Create new radar
   - PUT /api/radars/:id - Update radar (rename)
   - DELETE /api/radars/:id - Delete radar
   - POST /api/radars/:id/repos - Add repo to radar
   - DELETE /api/radars/:id/repos/:repoId - Remove repo from radar
   - POST /api/sync/trigger - Manual refresh trigger

3. **Generate contract tests** from contracts:
   - Auth flow contract tests
   - Data sync contract tests
   - Star/unstar GitHub API integration tests
   - Radar CRUD contract tests
   - Radar-repo assignment tests

4. **Extract test scenarios** from user stories:
   - Dashboard loads with starred repos
   - Rapid growth repos highlighted
   - Star/unstar syncs with GitHub
   - Radar creation, rename, and deletion works
   - Add/remove repos from radars works
   - Radar view displays correct repos
   - Detail page shows repo info and radar membership

5. **Update CLAUDE.md incrementally**

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy (Per MVP Slice)**:

**Slice 1 Tasks (MVP - Static Dashboard)**:
- Project setup: Vite, React, TypeScript, TailwindCSS
- GitHub OAuth setup (Supabase Auth)
- Simple API endpoint: fetch starred repos
- RepoCard component
- Dashboard page with list view
- Basic sorting functionality

**Slice 2 Tasks (Live Metrics)**:
- Enhance API: fetch issues and releases
- Growth calculation utility
- Add metrics to RepoCard
- Hot repo indicators
- Refresh functionality
- Loading states and error handling

**Slice 3 Tasks (Navigation & Radar Feature)**:
- Sidebar component with responsive behavior
- Mobile drawer/hamburger menu
- Route structure (/stars, /explore, /radar/:id, /repo/:id)
- Supabase schema for radars and radar_repos
- Radar CRUD operations (create, rename, delete)
- Add/remove repos to radars
- Radar dropdown component (desktop)
- Bottom sheet component (mobile)
- Repository detail page
- Collapsible search with ⌘K shortcut
- Radar icon with sweep animation
- Empty states for radars
- Limit handling UI (5 radars, 25 repos, 50 total)

**Slice 4 Tasks (Trend Detection)**:
- Historical data schema
- Cron job for hourly snapshots
- Trend calculation utilities
- Sparkline chart component
- Trending repos section
- Sort by growth rate
- Time period selectors (24h/7d/30d)

**Slice 5 Tasks (Full Analytics)**:
- Chart.js integration
- Full historical charts
- Detailed metrics modal
- Issue velocity calculations
- Release timeline component
- CSV export functionality
- Account deletion flow
- PWA manifest and service worker

**Ordering Strategy**:
1. Complete Slice 1 entirely (deployable)
2. Layer on Slice 2 features
3. Add persistence (Slice 3)
4. Enhance with trends (Slice 4)
5. Full features (Slice 5)

**Estimated Output**: 15-20 tasks for Slice 1 (true MVP), 40-50 total for all slices

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations - architecture aligns with constitutional principles*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*