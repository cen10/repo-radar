# Integration Tests

Integration tests verify that multiple components work together correctly. They test complete user flows with real hooks and state management, but with mocked API services.

## Unit Tests vs Integration Tests

| Aspect      | Unit Tests                            | Integration Tests                         |
| ----------- | ------------------------------------- | ----------------------------------------- |
| **Scope**   | Single component in isolation         | Multiple components working together      |
| **Mocking** | Mock hooks, child components          | Mock only at service layer (API boundary) |
| **State**   | Test props → UI mapping               | Test state flow across components         |
| **Focus**   | Does this component render correctly? | Does the user flow work end-to-end?       |

### What Belongs in Unit Tests

- Component renders correct UI for given props
- Form validation logic
- Button click calls correct callback
- Loading/error UI states
- Individual hook behavior
- Verifying a component calls `invalidateQueries` (single component behavior)

### What Belongs in Integration Tests

- Action in one component updates another (e.g., create in modal → appears in sidebar)
- Optimistic updates and rollback on error across components
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

`renderForIntegration` wraps your components in all the providers they need (QueryClient, AuthContext, Router). This lets you render multiple components together and verify that an action in one component correctly updates another.

```typescript
import { renderForIntegration } from '../helpers/integration-render';

// Render multiple components together with required provider(s)
renderForIntegration(
  <>
    <Sidebar />
    <CreateRadarModal />
  </>,
  { authState: { user: mockUser } }
);
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

### 3. Test Cross-Component Effects

The key to integration tests is rendering **multiple components** and verifying that an action in one affects the other:

```typescript
// Good: True integration test - action in modal affects sidebar
it('creates radar and shows it in sidebar', async () => {
  renderForIntegration(
    <>
      <Sidebar />
      <CreateRadarModal />
    </>
  );

  await user.type(input, 'My Radar');
  await user.click(submitButton);

  // Verify the sidebar updated
  expect(screen.getByText('My Radar')).toBeInTheDocument();
});

// Less ideal: Testing one component's cache behavior (more of a unit test)
it('invalidates radars query on success', async () => {
  renderForIntegration(<CreateRadarModal />);
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

  await user.click(submitButton);

  // This tests the modal in isolation, not the cross-component flow
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['radars'] });
});
```

The first test verifies the actual user-visible integration: create something, see it appear elsewhere. The second only checks that `invalidateQueries` was called—useful as a safety net, but not a true integration test.

### 4. Test User Flows, Not Implementation

Focus on what the user sees and does, not internal state changes. If the user fills a form and clicks submit, assert that the result appears in the UI—not that `isLoading` became `true`.

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
npm run test:integration

# Run with coverage
npm run test:coverage
```
