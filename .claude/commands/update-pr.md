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

## How to gather alternatives considered

The diff only shows the final approach, but reviewers benefit from knowing
what was considered and rejected. Check these sources in order:

1. **Decision docs and plan docs.** Check `docs/decisions/` and
   `docs/potential-plans/` for files related to this work. These docs are
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
## What

1-3 sentences explaining what this PR does and why. Focus on the outcome,
not the implementation journey.

## How

Bulleted list of the key implementation changes. Each bullet should
reference a specific file or area of the codebase. Group related changes
together rather than listing every file touched.

Keep bullets concise — one line each when possible. A reviewer should be
able to scan this in 30 seconds and understand the shape of the change.

## Testing

Brief description of how this was tested. Include:
- What test files were added or modified
- Any manual testing steps that are important for the reviewer to know
- Edge cases that were specifically covered

## Alternatives Considered (include when alternatives exist)

For each alternative that was seriously considered:

**[Alternative name/approach]** — 1-2 sentences on what this would look
like, followed by why we didn't go with it. Keep the "why not" concrete
and specific to this situation, not abstract principles.

If a decision doc or plan doc covers the alternatives in depth, pull the
key reasoning into this section directly. The docs repo is separate and
not accessible to reviewers — the PR description is the permanent,
visible record of the reasoning. Include enough detail that a reader
understands the trade-off without needing to ask follow-up questions.
A short code snippet showing what the rejected approach would have
looked like is worth including when it makes the trade-off concrete.

Aim for 2-4 alternatives, 4-6 lines each. This section is one of the
most valuable parts of the PR for demonstrating engineering judgment —
give it room to breathe.

## Notes (optional)

Include this section only if there's something the reviewer needs to know
that doesn't fit above:
- Trade-offs that were made and why
- Known limitations or follow-up work
- Related docs that were created or updated
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

## How to apply the update

After drafting the new description, show me the proposed title and body.
Wait for my approval before running `gh pr edit` to update it.

If the current description is already accurate, say so and suggest only
specific edits if any are needed.
