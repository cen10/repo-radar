# Integration Tests

Integration tests verify that multiple components work together correctly. They test complete user flows with real hooks and state management, but with mocked API services.

## Unit Tests vs Integration Tests

| Aspect | Unit Tests | Integration Tests |
|--------|------------|-------------------|
| **Scope** | Single component in isolation | Multiple components working together |
| **Mocking** | Mock hooks, child components | Mock only at service layer (API boundary) |
| **State** | Test props → UI mapping | Test state flow across components |
| **Focus** | Does this component render correctly? | Does the user flow work end-to-end? |

### What Belongs in Unit Tests

- Component renders correct UI for given props
- Form validation logic
- Button click calls correct callback
- Loading/error UI states
- Individual hook behavior

### What Belongs in Integration Tests

- Cache invalidation after actions
- Optimistic updates and rollback on error
- State synchronization across components (e.g., sidebar + page)
- Multi-step CRUD flows (create → navigate → see in list)
- Search/filter flows across pages

## Test Structure

```
tests/integration/
  radar-crud.test.tsx         # Radar create, rename, delete, add/remove repos
  repository-search.test.tsx  # Search and filtering across pages
```

## Writing Integration Tests

### 1. Use the Integration Render Helper

```typescript
import { renderForIntegration } from '../helpers/integration-render';
import { createRadarServiceMock, createGitHubServiceMock } from '../helpers/mock-services';

// Set up mocks before rendering
const radarService = createRadarServiceMock();
radarService.getRadars.mockResolvedValue([mockRadar]);

vi.mock('@/services/radar', () => radarService);

// Render with all providers
const { queryClient } = renderForIntegration(<App />, {
  route: '/radars/123',
  authState: { user: mockUser },
});
```

### 2. Mock at the Service Layer

Integration tests mock services (not hooks) to test real state management:

```typescript
// Good: Mock the service, use real hooks
vi.mock('@/services/radar', () => ({
  getRadars: vi.fn().mockResolvedValue([]),
  createRadar: vi.fn().mockResolvedValue(newRadar),
}));

// Bad: Mock the hook (this is for unit tests)
vi.mock('@/hooks/useRadars', () => ({
  useRadars: () => ({ data: [], isLoading: false }),
}));
```

### 3. Assert on Cache Behavior

```typescript
const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

// Trigger action
await user.click(screen.getByRole('button', { name: /create/i }));

// Verify cache invalidation
await waitFor(() => {
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
});
```

### 4. Test User Flows, Not Implementation

```typescript
// Good: Test the user-visible flow
it('creates radar and shows it in sidebar', async () => {
  // User fills form
  await user.type(nameInput, 'My Radar');
  await user.click(submitButton);

  // User sees result
  expect(screen.getByText('My Radar')).toBeInTheDocument();
});

// Bad: Test internal state
it('sets isCreating to true', async () => {
  // This tests implementation, not behavior
});
```

## Running Tests

```bash
# Run all tests (unit + integration)
npm run test

# Run only integration tests
npm run test -- tests/integration

# Run with coverage
npm run test -- --coverage
```
