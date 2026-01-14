# Tasks: GitHub Repository Momentum Dashboard

**Input**: Design documents from `/specs/001-develop-a-personalized/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/api-spec.yaml

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- Frontend: `src/` for React components and services
- Backend: `api/` for serverless functions
- Tests: `tests/` for all test files
- Types: `src/types/` for shared TypeScript interfaces

---

# MVP SLICE 1: Static Dashboard (T001-T020)

_Goal: Basic dashboard showing starred repositories_

## Phase 3.1: Setup (T001-T005)

- [x] T001 Initialize React project with Vite: `npm create vite@latest . -- --template react-ts`
- [x] T002 Install core dependencies: `npm install @tanstack/react-query tailwindcss @headlessui/react`
- [x] T003 [P] Configure TailwindCSS in `tailwind.config.js` and `src/index.css`
- [x] T004 [P] Set up ESLint and Prettier with configs in `.eslintrc.json` and `.prettierrc`
- [x] T005 [P] Create environment variables file `.env.local` with VITE_GITHUB_CLIENT_ID placeholder

## Phase 3.2: Type Definitions (T006-T007)

- [x] T006 [P] Create TypeScript interfaces in `src/types/index.ts` for User and Repository
- [x] T007 [P] Create API response types in `src/types/api.ts` for GitHub API responses

## Phase 3.3: Authentication Setup (T008-T011)

- [x] T008 Create Supabase project and configure GitHub OAuth provider in dashboard
- [x] T009 Install Supabase client: `npm install @supabase/supabase-js`
- [x] T010 Create Supabase client configuration in `src/services/supabase.ts`
- [x] T011 Create auth context provider in `src/contexts/AuthContext.tsx`

## Phase 3.4: Core Components (T012-T016)

- [x] T012 Create Login page component in `src/pages/Login.tsx` with GitHub OAuth button
- [x] T013 Create Header component in `src/components/Header.tsx` with user info and logout
- [ ] T014 Create RepoCard component in `src/components/RepoCard.tsx` to display repository info
- [ ] T015 Create Dashboard page in `src/pages/Dashboard.tsx` with repository list
- [ ] T016 [P] Create Loading component in `src/components/Loading.tsx` for loading states

## Phase 3.5: API Integration (T017-T019)

- [ ] T017 Create GitHub service in `src/services/github.ts` to fetch starred repositories
- [ ] T018 Create serverless function in `api/starred.ts` to proxy GitHub API calls
- [ ] T019 Set up React Query hooks in `src/hooks/useRepositories.ts` for data fetching

## Phase 3.6: Routing & Polish (T020)

- [ ] T020 Configure React Router in `src/App.tsx` with Login and Dashboard routes

---

# MVP SLICE 2: Live Metrics (T021-T032)

_Goal: Add current metrics and growth indicators_

## Phase 3.7: Enhanced Types (T021-T022)

- [ ] T021 [P] Extend Repository type in `src/types/index.ts` with metrics fields
- [ ] T022 [P] Create MetricsData type for growth calculations

## Phase 3.8: Metrics Utilities (T023-T025)

- [ ] T023 [P] Create metrics calculation utilities in `src/utils/metrics.ts`
- [ ] T024 [P] Create date formatting utilities in `src/utils/formatters.ts`
- [ ] T025 [P] Create sorting utilities in `src/utils/sort.ts`

## Phase 3.9: Enhanced API (T026-T028)

- [ ] T026 Update `api/starred.ts` to fetch repository issues and releases
- [ ] T027 Create `api/metrics.ts` endpoint to calculate growth rates
- [ ] T028 Update `src/services/github.ts` to use enhanced endpoints

## Phase 3.10: UI Updates (T029-T032)

- [ ] T029 Update RepoCard to display metrics with growth indicators
- [ ] T030 Add refresh button to Header component
- [ ] T031 Add last updated timestamp to Dashboard
- [ ] T032 [P] Create HotBadge component in `src/components/HotBadge.tsx` for trending repos

---

# MVP SLICE 3: Navigation & Radar Feature (T033-T055)

_Goal: Sidebar navigation, radar collections, and repository detail pages_
_See [ux-spec.md](./ux-spec.md) for detailed UX requirements_

## Phase 3.11: Layout & Navigation (T033-T038)

- [ ] T033 Create Sidebar component in `src/components/Sidebar.tsx` with My Stars, Explore nav items
- [ ] T034 Create SidebarRadarList component for displaying user's radars with counts
- [ ] T035 Create MobileDrawer component with hamburger menu trigger
- [ ] T036 Create AppLayout wrapper component that combines Header, Sidebar, and main content
- [ ] T037 Update routing in `src/App.tsx`: add /stars, /explore, /radar/:id, /repo/:id routes
- [ ] T038 Redirect /dashboard to /stars, update post-login redirect to /stars

## Phase 3.12: Supabase Radar Schema (T039-T042)

- [ ] T039 Create Supabase migration for radars table in `supabase/migrations/001_create_radars.sql`
- [ ] T040 Create Supabase migration for radar_repos table with RLS policies
- [ ] T041 Update database types in `src/types/database.ts` with Radar and RadarRepo interfaces
- [ ] T042 Create radar service functions in `src/services/radar.ts` (CRUD operations)

## Phase 3.13: Radar UI Components (T043-T049)

- [ ] T043 Create useRadars hook in `src/hooks/useRadars.ts` for fetching user's radars
- [ ] T044 Create RadarDropdown component for desktop "Add to Radar" interaction
- [ ] T045 Create BottomSheet component for mobile "Add to Radar" interaction
- [ ] T046 Add radar icon to RepoCard with filled/outline states
- [ ] T047 Create radar sweep animation CSS/component for add-to-radar feedback
- [ ] T048 Create CreateRadarModal component for creating new radars from sidebar
- [ ] T049 Create RadarContextMenu component with Rename/Delete actions

## Phase 3.14: Radar Page & Detail Page (T050-T053)

- [ ] T050 Create RadarPage component in `src/pages/RadarPage.tsx` with header and repo list
- [ ] T051 Create RepoDetailPage component in `src/pages/RepoDetailPage.tsx`
- [ ] T052 Update RepoCard click behavior to navigate to internal detail page
- [ ] T053 [P] Create EmptyState components for empty radar, no stars, no search results

## Phase 3.15: Search & Polish (T054-T055)

- [ ] T054 Create CollapsibleSearch component with ⌘K shortcut support
- [ ] T055 Add limit handling UI (disabled states, tooltips for 5 radars/25 repos/50 total limits)

---

# MVP SLICE 4: Trend Detection (T056-T071)

_Goal: Historical tracking and trend visualization_

## Phase 3.16: Historical Data Schema (T056-T059)

- [ ] T056 Create migration for star_metrics table in `supabase/migrations/002_metrics.sql`
- [ ] T057 Create migration for issue_metrics table
- [ ] T058 [P] Update database types for metrics entities
- [ ] T059 Create metrics service in `src/services/metrics.ts`

## Phase 3.17: Data Collection (T060-T063)

- [ ] T060 Create `api/sync.ts` serverless function for data collection
- [ ] T061 Configure Vercel cron job in `vercel.json` for hourly sync
- [ ] T062 Create sync status endpoint in `api/sync-status.ts`
- [ ] T063 Add sync status indicator to Dashboard

## Phase 3.18: Trend Calculations (T064-T066)

- [ ] T064 [P] Create trend calculation utilities in `src/utils/trends.ts`
- [ ] T065 Update metrics service to fetch historical data
- [ ] T066 Create useTrends hook in `src/hooks/useTrends.ts`

## Phase 3.19: Sparkline Charts (T067-T071)

- [ ] T067 Install chart library: `npm install react-sparklines`
- [ ] T068 [P] Create SparklineChart component in `src/components/charts/SparklineChart.tsx`
- [ ] T069 Add sparklines to RepoCard component
- [ ] T070 Create TrendingSection component in `src/components/TrendingSection.tsx`
- [ ] T071 Add sort by growth rate option to RepositoryList

---

# MVP SLICE 5: Full Analytics (T072-T089)

_Goal: Detailed analytics and complete features_

## Phase 3.20: Full Charts (T072-T076)

- [ ] T072 Install Chart.js: `npm install chart.js react-chartjs-2`
- [ ] T073 [P] Create LineChart component in `src/components/charts/LineChart.tsx`
- [ ] T074 [P] Create BarChart component in `src/components/charts/BarChart.tsx`
- [ ] T075 Create MetricsModal component in `src/components/MetricsModal.tsx`
- [ ] T076 Add "View Details" action to RepoCard

## Phase 3.21: Advanced Metrics (T077-T080)

- [ ] T077 Create `api/repos/[id]/metrics.ts` for detailed metrics
- [ ] T078 Add release timeline to MetricsModal
- [ ] T079 Calculate and display issue velocity
- [ ] T080 Create useDetailedMetrics hook

## Phase 3.22: Data Export (T081-T083)

- [ ] T081 [P] Create CSV export utility in `src/utils/export.ts`
- [ ] T082 Add export button to radar views
- [ ] T083 Create `api/export.ts` endpoint for data export

## Phase 3.23: Account Management (T084-T086)

- [ ] T084 Create AccountSettings page in `src/pages/AccountSettings.tsx`
- [ ] T085 Create `api/user/delete.ts` endpoint for account deletion
- [ ] T086 Implement soft delete with 30-day recovery window

## Phase 3.24: PWA & Polish (T087-T089)

- [ ] T087 [P] Create PWA manifest in `public/manifest.json`
- [ ] T088 [P] Add service worker for offline support
- [ ] T089 Performance optimization: implement virtual scrolling for large lists

## Phase 3.25: Test Architecture Restructuring (T090-T093)

_Goal: Separate unit, integration, and E2E tests for clearer responsibilities_

**Problem**: Current component tests mock child components (e.g., Dashboard.test.tsx mocks RepositoryList), creating mock maintenance burden without integration confidence. Mocks can drift from real implementations.

**Solution**: Three-tier test structure:

- [ ] T090 Create integration test directory structure in `src/__integration__/` or `tests/integration/`
- [ ] T091 Refactor `Dashboard.test.tsx`: Extract interaction tests (search, filter, star/unstar) to integration tests, keep only Dashboard-specific unit logic
- [ ] T092 Refactor `RepositoryList.test.tsx`: Extract interaction tests to integration tests
- [ ] T093 Update test documentation in CLAUDE.md with new test tier guidelines

**Test tiers after refactor**:

1. **Unit tests** - Isolated logic: utilities, API services, hooks, pure functions
2. **Integration tests** - Real component trees with mocked external boundaries (API, auth)
3. **E2E tests (Playwright)** - Full browser flows

---

## Parallel Execution Examples

### Batch 1: Initial Setup (can run together)

```bash
# Terminal 1
Task T003: Configure TailwindCSS

# Terminal 2
Task T004: Set up ESLint and Prettier

# Terminal 3
Task T005: Create environment variables
```

### Batch 2: Type Definitions (can run together)

```bash
# Terminal 1
Task T006: Create core TypeScript interfaces

# Terminal 2
Task T007: Create API response types
```

### Batch 3: Component Creation (can run together after auth setup)

```bash
# Terminal 1
Task T016: Create Loading component

# Terminal 2
Task T043: Create EmptyState component
```

## Task Dependencies

```mermaid
graph TD
    T001 --> T002 --> T003
    T001 --> T004
    T001 --> T005
    T006 --> T012
    T006 --> T014
    T008 --> T010 --> T011
    T011 --> T012
    T014 --> T015
    T017 --> T019
    T015 --> T020
```

## Validation Checklist

- ✅ All API endpoints from contracts have implementation tasks
- ✅ All entities from data-model have type definitions
- ✅ Authentication flow is complete (T008-T011)
- ✅ Each slice builds on the previous one
- ✅ Parallel tasks marked with [P] don't share files
- ✅ Testing tasks included for critical paths
- ✅ Performance optimizations in final slice

## Notes

1. **Slice 1 Priority**: Complete T001-T020 first for a deployable MVP
2. **Testing Strategy**: Integration tests focus on critical paths (auth, preferences, sync)
3. **Parallel Execution**: Tasks marked [P] can run simultaneously if they modify different files
4. **Environment Setup**: Requires Supabase account and GitHub OAuth app configuration
5. **Deployment**: Each slice is independently deployable to Vercel/Netlify

---

**Total Tasks**: 80
**Slice 1 (MVP)**: 20 tasks (~3-4 days)
**Full Implementation**: 80 tasks (~18-20 days)
