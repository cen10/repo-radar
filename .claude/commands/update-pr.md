Update the PR description for the current branch to accurately reflect the
final state of the work.

## How to assess the current state

1. Run `git diff main...HEAD` to see the actual changes against main. This
   is the source of truth — not the commit history.
2. Run `gh pr view --json title,body` to read the current PR description.
3. Compare the two. Identify anything in the description that:
   - Describes an approach that was later changed within this branch
   - Mentions fixing a bug that was introduced by earlier commits in the
     same branch (this isn't a bug fix — it's iteration on new work)
   - References implementation details that no longer match the diff
   - Is missing changes that are in the diff but not in the description

## How to gather decisions and alternatives

The diff only shows the final approach, but reviewers benefit from knowing
what was considered and rejected. Check these sources in order:

1. **Decision docs and plan docs.** Check `docs/decisions/` and
   `docs/potential-plans/` for files related to this work. (Note: The `docs/`
   folder is symlinked and not in git. Use `ls $CWD/docs/decisions/` and
   `ls $CWD/docs/potential-plans/` to find files.) These docs are
   not committed to the main repo, so reviewers can't access them — copy
   the relevant reasoning directly into the PR description. Don't just
   link to them.
2. **The current conversation.** If we discussed alternatives earlier in
   this session, pull from that context.
3. **Ask me.** If neither source has alternatives, ask: "Were there other
   approaches you considered for this? I want to include them in the PR
   description." Don't skip this step — just include my answer in the
   draft. If I say there weren't any meaningful alternatives, omit the
   section entirely.

## How to write the updated description

The PR description should read as if the final implementation was the plan
all along. A reviewer reading this description and then reading the diff
should find no surprises.

**Title:** Imperative mood, ≤ 50 characters. Should describe the user-facing
or developer-facing outcome, not the implementation mechanism.

**Body structure:**

```
## Why

1-2 sentences explaining the problem this solves or why the change is needed.
Focus on motivation, not implementation.

## What

Bulleted list of the key changes. Each bullet should reference a specific
file or area of the codebase when helpful. Group related changes together
rather than listing every file touched.

Keep bullets concise — one line each when possible. A reviewer should be
able to scan this in 30 seconds and understand the shape of the change.

## Decisions

Include when there are non-obvious choices, alternatives considered, or
tradeoffs worth documenting. For each significant decision:

**[Decision or alternative name]** — 1-2 sentences on what this involves,
followed by why we chose or rejected it. Keep reasoning concrete and
specific to this situation, not abstract principles.

If a decision doc or plan doc covers the reasoning in depth, pull the key
points directly into this section. The docs repo is separate and not
accessible to reviewers — the PR description is the permanent, visible
record. Include enough detail that a reader understands the trade-off
without needing to ask follow-up questions.

Omit this section entirely if there are no meaningful decisions to document.

## Test plan

Brief description of how this was tested. Include:
- What test files were added or modified
- Any manual testing steps important for the reviewer
- Edge cases that were specifically covered

## Screenshots

Include only for UI changes. Show before/after when relevant.
Remove this section entirely if there are no UI changes.

## Breaking changes

Include only if there are breaking changes. Describe what breaks and any
migration steps needed. Remove this section entirely if none.
```

## Rules

- **Never reference the commit history.** Don't say "initially we tried X
  but switched to Y" or "fixed a bug where Z happened." The description
  should only reflect the final state.

- **Don't describe work that was undone.** If commit A added a feature and
  commit E removed it, neither the addition nor the removal belongs in the
  description.

- **Iteration within the branch is invisible to the reviewer.** If the
  approach changed three times, describe the final approach as if it was
  the only approach. The commit history exists for archeology if someone
  needs it later.

- **Bugs introduced and fixed within the branch don't exist.** If a commit
  introduced a regression and a later commit fixed it, neither the bug nor
  the fix should appear in the description. The final diff doesn't contain
  a bug or a fix — it contains working code.

- **Match the diff, not your memory.** If you remember discussing a change
  but it's not in the diff, don't include it. If the diff contains
  something unexpected, include it and flag it for me to review.

- **Remove optional sections when empty.** If there are no screenshots, no
  breaking changes, or no decisions worth documenting, remove those sections
  entirely rather than leaving them empty or writing "None."

## How to apply the update

After drafting the new description, show me the proposed title and body.
Wait for my approval before running `gh pr edit` to update it.

If the current description is already accurate, say so and suggest only
specific edits if any are needed.
