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
- Free tier allows hourly updates (sufficient for MVP)
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

### 6. React Query Caching Strategy

**Decision**: Stale-while-revalidate with optimistic updates
**Rationale**:
- Shows cached data immediately (better perceived performance)
- Background refetch keeps data fresh
- Optimistic updates for follow/unfollow actions
- Aligns with 3-second load time requirement

**Configuration**:
```typescript
{
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: true,
  refetchInterval: 60 * 60 * 1000 // 1 hour
}
```

**Alternatives Considered**:
- No caching: Poor performance
- Redux + RTK Query: Unnecessary complexity
- SWR: Less mature ecosystem

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