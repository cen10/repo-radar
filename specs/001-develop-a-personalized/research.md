# Technical Research: GitHub Repository Momentum Dashboard

**Date**: 2025-09-15
**Feature**: Repository Momentum Tracking Dashboard

## Executive Summary

This document consolidates technical research findings for implementing a GitHub repository momentum dashboard using React, Supabase, and serverless functions. All technical decisions have been validated against the constitutional requirements for simplicity, performance, and iterative delivery.

## Research Areas

### 1. GitHub Authentication Strategy

**Decision**: GitHub OAuth App
**Rationale**:
- Simpler setup than GitHub App (no webhook infrastructure needed)
- Sufficient for user authentication and accessing public + starred repos
- OAuth flow well-supported by Supabase Auth
- Lower operational complexity aligns with MVP approach

**Alternatives Considered**:
- GitHub App: More complex setup, better for organization-wide access
- Personal Access Tokens: Poor UX, security concerns
- Basic Auth: Deprecated by GitHub

### 2. Supabase Row Level Security (RLS) Pattern

**Decision**: User-based isolation with JWT claims
**Rationale**:
- Built-in RLS policies using auth.uid()
- Automatic user isolation without application logic
- Performance optimized at database level
- Prevents data leaks between users

**Implementation Pattern**:
```sql
-- Enable RLS on tables
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Policy for user-specific data
CREATE POLICY "Users can only see their own data" ON repositories
  FOR ALL USING (auth.uid() = user_id);
```

**Alternatives Considered**:
- Application-level filtering: Less secure, more error-prone
- Separate schemas per user: Overly complex for MVP

### 3. GitHub API Rate Limit Management

**Decision**: Hybrid caching with conditional requests
**Rationale**:
- Use ETags and If-None-Match headers to minimize API calls
- Cache responses in Supabase with TTL
- Batch requests where possible (GraphQL for multiple repos)
- Show stale data with freshness indicators during rate limiting

**Implementation Strategy**:
- Store ETags with cached responses
- Use GitHub's conditional request headers
- Implement exponential backoff on 429 responses
- Display last-updated timestamps prominently

**Alternatives Considered**:
- Aggressive caching only: Poor data freshness
- No caching: Would hit rate limits quickly
- Redis cache layer: Unnecessary complexity for MVP

### 4. Serverless Function Scheduling

**Decision**: Vercel Cron Jobs with Supabase Edge Functions fallback
**Rationale**:
- Vercel Cron Jobs are simple to configure in vercel.json
- Free tier allows daily updates (sufficient for MVP; hourly would exceed GitHub API rate limits at scale)
- Supabase Edge Functions as backup for on-demand refreshes
- No additional infrastructure needed

**Configuration**:
```json
{
  "crons": [{
    "path": "/api/sync",
    "schedule": "0 * * * *"
  }]
}
```

**Alternatives Considered**:
- GitHub Actions: More complex deployment
- AWS Lambda + EventBridge: Vendor lock-in
- External cron service: Additional dependency

### 5. Chart Visualization Library

**Decision**: Chart.js with react-chartjs-2
**Rationale**:
- Excellent performance with 500+ data points using decimation
- Built-in responsive design
- Tree-shakeable for smaller bundle size
- Strong React integration
- Accessibility features built-in

**Performance Optimizations**:
- Use data decimation for large datasets
- Implement virtual scrolling for chart containers
- Lazy load chart components

**Alternatives Considered**:
- Recharts: Larger bundle size, slower with many points
- D3.js: Overly complex for simple time-series
- Victory: Performance issues with large datasets

### 6. Multi-Tier Caching Strategy

**Decision**: Three-tier caching with transparency and manual refresh

GitHub API rate limits (5,000 req/hour per user) and the inability to receive push notifications for repos we don't own necessitate a caching strategy that balances freshness with scalability.

**Industry Research**: Products like Star History, GitTrends, npm-stat, and financial data providers (Yahoo Finance, TradingView) all use similar patterns:
- Free tiers show delayed/cached data (1-24 hours)
- Paid tiers offer fresher data (5-30 minutes)
- All show "last updated" timestamps for transparency
- Manual refresh buttons let users force fresh fetches

**Architecture**:
```
┌─────────────────────────────────────────────────────────────┐
│  Tier 1: TanStack Query (Client)                            │
│  └── In-memory + localStorage persistence                   │
│  └── 1-hour staleTime for repo data                        │
│  └── Optimistic updates for user actions                   │
├─────────────────────────────────────────────────────────────┤
│  Tier 2: Supabase Cache (Server)                            │
│  └── Shared across all users                               │
│  └── Reduces GitHub API calls dramatically                 │
│  └── Updated by daily sync job                             │
├─────────────────────────────────────────────────────────────┤
│  Tier 3: GitHub API (Source of Truth)                       │
│  └── Fetched on cache miss                                 │
│  └── Manual refresh uses user's rate limit                 │
└─────────────────────────────────────────────────────────────┘
```

**Freshness Guarantees**:
| Data Source | Max Staleness | Notes |
|-------------|---------------|-------|
| Daily sync | 24 hours | Background job for all tracked repos |
| User actions in app | Instant | Optimistic updates |
| Manual refresh | Real-time | Uses user's rate limit |

**Client Configuration (TanStack Query)**:
```typescript
{
  staleTime: 60 * 60 * 1000, // 1 hour
  gcTime: 24 * 60 * 60 * 1000, // 24 hours
  refetchOnWindowFocus: false, // Don't waste API calls
}
```

**UX Requirements**:
- Always show "Last updated: X" timestamp
- Provide manual refresh button (↻)
- Optimistic UI for star/unstar and radar actions

**Future (Paid Tier)**:
- 15-minute staleTime
- Priority in background refresh queue
- More frequent sync (every 6 hours)

**Alternatives Considered**:
- Real-time for all users: Not possible without webhooks (requires repo access)
- No caching: Would hit rate limits quickly
- Polling every 5 minutes: Wasteful, still not "real-time"

### 7. Mobile-First Responsive Strategy

**Decision**: TailwindCSS with Headless UI components
**Rationale**:
- Mobile-first utility classes by default
- Headless UI provides accessible, unstyled components
- Consistent with user's technical requirements
- Small bundle size with PurgeCSS
- Excellent responsive grid system

**Breakpoint Strategy**:
- Mobile: < 640px (default)
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Alternatives Considered**:
- Material-UI: Heavier, opinionated styling
- Ant Design: Not mobile-first
- Custom CSS: More maintenance overhead

### 8. Account Deletion Implementation

**Decision**: Soft delete with 30-day recovery window
**Rationale**:
- Prevents accidental data loss
- Compliance with data protection regulations
- Allows graceful cleanup of related data
- User can recover within grace period

**Implementation**:
- Mark account as deleted_at timestamp
- Exclude soft-deleted accounts from queries
- Scheduled job to hard delete after 30 days
- Export user data before hard delete

**Alternatives Considered**:
- Immediate hard delete: Risk of data loss
- No deletion: Privacy concerns
- Manual deletion process: Poor UX

## Performance Optimizations

### Bundle Size Strategy
- Code splitting by route
- Lazy load chart components
- Tree-shake unused TailwindCSS utilities
- Dynamic imports for heavy components

### API Response Optimization
- Paginate at 100 repos per request
- Virtual scrolling for long lists
- Debounce search inputs
- Batch follow/unfollow operations

### Caching Hierarchy
1. Browser cache (static assets)
2. React Query cache (API responses)
3. Supabase cache (computed metrics)
4. CDN cache (static resources)

## Security Considerations

### Authentication Flow
- PKCE flow for OAuth
- Secure token storage in httpOnly cookies
- Refresh token rotation
- Session timeout after 7 days

### Data Protection
- All API calls over HTTPS
- Supabase RLS for data isolation
- No client-side secret storage
- Environment variables for sensitive config

## MVP Iteration Strategy

### Phase 1: Core Dashboard (Week 1-2)
- GitHub OAuth login
- Display starred repos with current stars
- Basic list view
- Manual refresh button

### Phase 2: Metrics & Trends (Week 3-4)
- Historical star tracking
- Growth rate calculations
- Simple trend indicators
- Chart visualizations

### Phase 3: Personalization (Week 5-6)
- Follow/unfollow functionality
- Preference persistence
- Filtered views
- Rapid growth highlighting

### Phase 4: Polish & Performance (Week 7-8)
- Performance optimizations
- Error handling
- Loading states
- PWA features

## Conclusion

All research findings align with the project requirements for simplicity, performance, and iterative value delivery. The chosen technologies provide a solid foundation for the MVP while allowing for future enhancements without major refactoring. Testing strategy focuses on demonstrating comprehensive testing knowledge through key test coverage rather than strict TDD.

## Next Steps

Proceed to Phase 1: Design & Contracts with:
- Data model definition
- API contract specification
- Test scenario extraction
- Quickstart guide creation