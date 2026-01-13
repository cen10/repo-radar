# Starred Repositories Caching Strategy

## The Three Caches

We have three separate query caches for repository data:

1. **`allStarredRepositories`** - Bulk fetch of up to 500 starred repos, used for "Most Stars" sorting (requires client-side sort of all data)
2. **`starredRepositories`** - Paginated fetch for "Recently Starred" and "Recently Updated" views (server-side sorting, page by page)
3. **`searchRepositories`** - Search results from GitHub's search API

## The Original Problem: Duplicate Fetches

We discovered that `useStarredIds` was independently fetching all 500 starred repos on every page load, using a *different* cache key than `useAllStarredRepositories`. This meant:

- First Dashboard visit: 5 API calls from `useStarredIds`
- User switches to "Most Stars" sort: 5 MORE API calls from `useAllStarredRepositories`
- Total: 10 API calls for identical data

The fix: `useStarredIds` now reads from the shared `allStarredRepositories` cache instead of fetching independently. It provides `addRepo` and `removeRepo` functions that optimistically update that shared cache.

## Why We Pre-Warm the Cache

The bulk fetch (`allStarredRepositories`) is enabled on every Dashboard load, not just when sorting by "Most Stars". This means:

- **First visit**: 5 API calls to fetch 500 repos
- **Switch to "Most Stars" sort**: Instant (cache already warm)
- **Navigate away, come back**: Uses cached data (0 API calls)
- **Page refresh**: Cache cleared, fetches again

With `staleTime: Infinity`, the cache never becomes "stale" during a session. It only refetches on page refresh or manual invalidation.

## Why We DON'T Invalidate `allStarredRepositories` on Star/Unstar

When a user stars or unstars a repo, we use optimistic updates for the bulk cache:

```typescript
addRepo(repo);   // Adds repo to cache immediately
removeRepo(repo); // Removes repo from cache immediately
```

We do NOT call `invalidateQueries({ queryKey: ['allStarredRepositories'] })` because:

1. The optimistic update already reflects the change in the UI
2. Invalidation would trigger a background refetch of all 500 repos (5 API calls)
3. Those 5 API calls would happen every time someone stars/unstars anything

Since `staleTime: Infinity` means the cache never auto-refetches, and our optimistic updates keep it in sync with user actions, there's no need to invalidate. The only time the bulk data refetches is on page refresh.

## Why We DO Invalidate `starredRepositories` and `searchRepositories`

These caches are different:

**Paginated (`starredRepositories`):**
- Data comes page-by-page from GitHub's API with server-side sorting
- We don't have easy access to modify individual pages optimistically
- The sort order is determined by the server (e.g., "Recently Starred" uses GitHub's `starred_at` timestamp)

**Search (`searchRepositories`):**
- Results come from GitHub's search API
- The `is_starred` property on each result needs to reflect current state

When we call `invalidateQueries`, React Query:
1. Marks the query as "stale"
2. Triggers a background refetch
3. **Keeps serving the existing data** while refetching (stale-while-revalidate pattern)
4. Silently swaps in new data when it arrives

This is why users don't see a "flash" - the old data stays visible during the refetch.

## The Cost of Invalidation

When invalidating an infinite query (like our paginated results), React Query refetches ALL loaded pages. If a user has scrolled through 5 pages, invalidation triggers 5 API calls to refetch all of them.

## Alternative: Skip Invalidation Entirely

We considered not invalidating at all and relying purely on optimistic updates:

**For unstarring:** We already have `pendingUnstars` - a localStorage-based mechanism that filters out recently unstarred repos from the UI immediately. This gives instant feedback without any API calls.

**Problems with this approach:**

1. **`pendingUnstars` has a 60-second TTL** - If a user unstars a repo and waits 61+ seconds without refreshing, the repo could reappear in the UI (the filter expires).

2. **No equivalent for starring** - There's no `pendingStars` mechanism. If you star a repo from "Explore All" and switch to "My Stars", the newly starred repo won't appear until page refresh. This feels broken.

3. **Stale counts** - The "X repositories" count would be wrong.

## Alternative: Partial Cache Invalidation (Truncation)

We discussed a smarter approach: instead of invalidating all pages, truncate the cache after the user's current scroll position.

**The idea:**
1. User has scrolled through pages 1-5
2. User scrolls back up to page 2
3. User unstars a repo on page 2
4. Instead of refetching all 5 pages:
   - Keep page 1 (untouched)
   - Remove the repo from page 2 (optimistic update)
   - Discard pages 3-5 from cache
   - Pages 3-5 refetch naturally when user scrolls down again

**Implementation challenges:**

1. **Tracking scroll position** - We'd need to know which page the user is currently viewing (requires intersection observer per page or scroll position calculation).

2. **React Query's data structure** - Infinite queries store all pages in one array. We can use `setQueryData` to truncate it, but it requires careful manipulation.

3. **The gap problem** - When you remove an item from page 2, technically an item from page 3 should "shift up" to fill the gap. Without refetching, you'd have a gap. When the user scrolls to load more, they might see duplicate items or missing items at page boundaries.

4. **The "roughly same position" issue** - Even with truncation, the user might experience a small UI jump. If they were looking at item #45 and we remove item #42, item #45 shifts up to position #44. The scroll position (in pixels) stays the same, but the content moves slightly.

**Why we didn't implement this:**

The savings (1-5 API calls occasionally on star/unstar) didn't justify the added complexity. Starring/unstarring is a relatively infrequent action, and the current approach (background refetch with stale-while-revalidate) provides a smooth UX without the user noticing the refetch.

## Cache Clearing on Logout

When a user signs out, we clear the entire React Query cache. This serves as a natural sync point:

1. **User stars/unstars repos on GitHub directly** (outside our app)
2. **User logs out** (manually or session expires) → cache is cleared
3. **User logs back in** → fresh data fetched from GitHub

This means logout/login cycles will always result in fresh data, providing users with a reliable way to sync with GitHub's state without needing to refresh the page.

## Summary of Current Behavior

| Action | `allStarredRepositories` | `starredRepositories` | `searchRepositories` |
|--------|-------------------------|----------------------|---------------------|
| Page load | Fetches (pre-warm) | Fetches page 1 | No fetch until search |
| Navigate back (same session) | Uses cache | Uses cache | Uses cache |
| Page refresh | Refetches | Refetches | Refetches |
| Sign out | **Clears cache** | **Clears cache** | **Clears cache** |
| Star repo | Optimistic add | Invalidates (refetch) | Invalidates (refetch) |
| Unstar repo | Optimistic remove | Invalidates (refetch) | Invalidates (refetch) |
| Switch to "Most Stars" | Uses cache (instant) | N/A | N/A |

This gives us a good balance: minimal API calls for the bulk data (which is expensive), while keeping paginated/search views fresh with acceptable cost (typically 1-3 API calls on star/unstar).
