Create or update the PR for the current branch.

ARGUMENTS: $ARGUMENTS

## Determine the operation

Check the arguments first:
- If the user says "create" or "create pr", this is a **create** operation.
- If the user says "update" or "update pr", this is an **update** operation.
- If unclear, ask the user whether to create or update.

Do NOT run `gh pr view` to check if a PR exists — trust the user's intent.

## How to assess the current state

1. Run `git diff main...HEAD` to see the actual changes against main. This
   is the source of truth — not the commit history, not the existing PR
   description, not your memory of the conversation.
2. For updates: Run `gh pr view --json title,body` to read the current PR
   description and identify what needs to change.

## How to access decision docs and plan docs

**IMPORTANT: The `docs/` folder is a symlink to an external directory.**

The Glob and Read tools do NOT follow symlinks reliably. You must use Bash
commands to access docs:

```bash
# List decision docs
ls docs/decisions/

# List plan docs
ls docs/potential-plans/

# Read a specific doc
cat docs/decisions/001-example.md
```

Do NOT use:
- `Glob` with `docs/**/*.md` — returns no files
- `Read` without first confirming the file exists via `ls`

These docs are not committed to the main repo, so reviewers can't access
them. Copy relevant reasoning directly into the PR description.

## How to gather decisions and alternatives

The diff shows the final approach, but reviewers benefit from knowing what
was considered and rejected. Check these sources in order:

1. **Decision docs and plan docs.** Use `ls docs/decisions/` and
   `ls docs/potential-plans/` to find files related to this work.
2. **The current conversation.** If we discussed alternatives earlier in
   this session, pull from that context.
3. **Ask me.** If neither source has alternatives, ask: "Were there other
   approaches you considered for this?" If I say no, omit the Decisions
   section entirely.

## Writing the PR description

The PR description should read as if the final implementation was the plan
all along. A reviewer reading this description and then reading the diff
should find no surprises.

**This applies to BOTH new PRs AND updates.** When updating a PR, don't
describe what changed since the last description — describe the final state
as if writing it fresh. The diff against main is the only source of truth.

**Title:** Imperative mood, ≤ 50 characters. Describe the user-facing or
developer-facing outcome, not the implementation mechanism.

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
  the only approach.

- **For updates: Don't describe changes since the last PR description.**
  The PR description is not a changelog. If the last description said
  "Uses approach A" and you now use approach B, just write "Uses approach B"
  — don't write "Changed from approach A to approach B."

- **Bugs introduced and fixed within the branch don't exist.** If a commit
  introduced a regression and a later commit fixed it, neither the bug nor
  the fix should appear in the description.

- **Match the diff, not your memory.** If you remember discussing a change
  but it's not in the diff, don't include it. If the diff contains
  something unexpected, include it and flag it for me to review.

- **Remove optional sections when empty.** If there are no screenshots, no
  breaking changes, or no decisions worth documenting, remove those sections
  entirely rather than leaving them empty or writing "None."

## How to apply

**For new PRs:**
1. Draft the title and body based on `git diff main...HEAD`
2. Show me the proposed description
3. Wait for my approval
4. Run `gh pr create --title "..." --body "..."`

**For updates:**
1. Compare `git diff main...HEAD` with the current PR description
2. If changes are needed, draft the updated title and body
3. Show me the proposed changes
4. Wait for my approval
5. Run `gh pr edit --title "..." --body "..."`

If the current description is already accurate, say so and suggest only
specific edits if any are needed.
