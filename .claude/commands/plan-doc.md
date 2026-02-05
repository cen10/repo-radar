Create a plan document in `docs/potential-plans/` for something we just
discussed that we're not implementing right now but don't want to lose.

Use the filename format `kebab-case-topic.md` (e.g.,
`coordinated-loading-states.md`, `button-component.md`). Before creating the file,
check the existing files in that directory to find the highest numeric prefix
(e.g., if `003-fixture-chaining-pattern.md` exists, the next file should start with
`004-`). Zero-pad to three digits.

This doc is a parking lot for future work. I'll come back to it when the time
is right — either because a related task makes it natural to pick up, a bug
report surfaces the issue, or I'm looking for something to work on. Write it
so I can quickly assess "should I do this now?" from the top of the doc and
get a full implementation plan from reading the rest.

Use this exact structure:

---

# [Descriptive Title]

> **Status:** Not Started | In Progress | Implemented | Won't Implement
> **Date:** YYYY-MM-DD
> **Priority:** High | Medium | Low — followed by a short justification
> **Scope:** Small (< 1 hour) | Medium (1-4 hours) | Large (4+ hours)

## Problem Statement

What's wrong, missing, or suboptimal. Be specific and concrete — not "the
loading states could be better" but "when a page loads with RepoCards, the
radar icons appear gray initially, then flash to indigo after the API call
completes."

If there's a visual or behavioral sequence that illustrates the problem,
show it:

```
Step 1 happens
    ↓
Step 2 happens (this is where it breaks)
    ↓
User sees [undesirable outcome]
```

## Root Cause

What's actually causing the problem at a technical level. Include code
snippets from the codebase showing the relevant implementation. This is
separate from the problem statement — the problem is what the user
experiences, the root cause is what the code does wrong.

If the root cause involves multiple components interacting, show the flow.

Skip this section if the plan is about adding something new rather than
fixing something broken (e.g., a Button component abstraction). In that
case, expand the Problem Statement to include the current state — for
example, an inventory of existing patterns that would be consolidated.

## Solution Options

Present the options we discussed. For each one:

### Option [A/B/C]: [Short Name]

Brief explanation of the approach, followed by a code snippet showing what
it would look like in practice.

**Pros:**

- Concrete benefit tied to this specific situation

**Cons:**

- Concrete drawback or trade-off

If we genuinely only discussed one approach and it's clearly the right one,
skip the multi-option format and go straight to the implementation plan.
Don't invent alternatives we didn't actually consider just to fill out the
structure.

### Recommended: Option [X]

State which option we're recommending and why in 2-3 sentences. If the
recommendation involves combining elements from multiple options, explain
that here.

## Implementation Plan

Step-by-step breakdown of what to build, in order. Each step should include:

- What to create or modify
- A code snippet showing the key change (actual code, not pseudocode)
- Brief explanation of why this step matters if it's not obvious

Group steps into phases if the plan is large enough to warrant incremental
delivery (e.g., "Phase 1: Create the component, Phase 2: Write tests,
Phase 3: Migrate existing usage").

## Files to Modify

| File                  | Changes                           |
| --------------------- | --------------------------------- |
| `src/path/to/file.ts` | Brief description of what changes |

Include both new files to create and existing files to modify.

## Tests to Add

Bulleted list of specific test cases. Each should describe what's being
tested, not just a file name:

- `ComponentName.test.tsx` — Verify [specific behavior] when [condition]
- Integration test — Verify [end-to-end behavior]

## Verification

Numbered list of manual testing steps to confirm the implementation works.
Write these as things I can actually do in the browser:

1. Navigate to [page]
2. Do [action]
3. Verify [expected outcome]

## Implementation Trigger

When to actually pick this up. Be specific about the conditions:

- When [related feature/task] is being worked on
- When a bug report comes in about [related behavior]
- When [threshold] is reached (e.g., "when we add a 5th GitHub API function
  with the same error handling pattern")
- During a dedicated [refactoring/cleanup/performance] sprint

If we discussed reasons NOT to implement this yet, include them here so I
don't re-litigate the same conversation later. Frame it as "Why not now:"
followed by the specific reasons.

---

## Guidance on length and detail

Match the doc length to the scope:

- **Small scope (< 1 hour):** Keep it tight. Problem → Solution → Files →
  Verification. Skip the multi-option format if there's only one viable
  approach. Target ~60-100 lines. See `fix-sidebar-layout-shift.md` as an
  example.

- **Medium scope (1-4 hours):** Include 2-3 options with pros/cons, a
  phased implementation plan, and test cases. Target ~120-200 lines. See
  `radar-page-repo-removal-cache-invalidation.md` as an example.

- **Large scope (4+ hours):** Full treatment — inventory of current state,
  multiple options with code, detailed phased plan, file list, test list,
  and verification steps. Target ~200-350 lines. See
  `coordinated-loading-states.md` as an example.

## Style and tone guidelines

- Technical and direct — this is a plan, not a pitch
- Include real code from the codebase for the current state, and realistic
  code for the proposed changes
- Be honest about trade-offs — if the recommended option has downsides,
  name them
- If this plan relates to another doc in `docs/potential-plans/` or
  elsewhere, cross-reference it with a note at the top (e.g., "NOTE: See
  also `radar-icon-loading-state.md` which addresses a related issue")
- The "Why not now" reasoning is just as valuable as the implementation
  plan — it prevents the same discussion from happening twice
