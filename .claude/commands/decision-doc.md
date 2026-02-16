Create a document in `docs/decisions/` explaining a technical decision we just
made or discussed.

**Important:** The `docs/` folder is symlinked and not checked into git. It
exists locally at the workspace root but glob/grep won't find it through the
worktree. To check existing files, use bash directly with the current working
directory: `ls $CWD/docs/decisions/`

Before creating the file, list existing files to find the highest numeric prefix
(e.g., if `003-architecture-migration.md` exists, the next file should start
with `004-`). Zero-pad to three digits.

This doc is a reference I'll come back to when I need to remember why we made
a specific decision — whether that's in an interview, during a code review, or
months from now when I've forgotten the context. Write it so I can get the
answer in 10 seconds from the top of the doc, or get the full reasoning in
2-3 minutes by reading the whole thing.

Use this exact structure:

---

# [Descriptive Title]

The title should name the decision area and the specific choice, not just the
topic.
Good: "Route-Level Auth Guards" or "GitHub Auth Error Handling: Before vs After"
Bad: "Auth Decision" or "Routing Changes"

> **Status:** Active | Superseded by [XXX] | Planned
> **Date:** YYYY-MM-DD
> **Decision:** One sentence stating what we decided.

The status, date, and decision line go at the top as a blockquote so they're
immediately visible. The decision line should be a complete answer — someone
reading only this line should understand the choice.

## The Problem

What specifically prompted this decision. Not background context about the
project — the concrete issue, limitation, or requirement that forced a choice.
2-4 sentences max.

## Options Considered

### Option A: [Name]

- Brief explanation of the approach
- **Actual code snippet** showing what this looks like in practice
- If this is the option we chose, just describe it here — the detail goes in
  the Implementation section

### Option B: [Name]

- Brief explanation of the alternative
- **Actual code snippet** if it helps illustrate the difference
- Why we didn't choose this (specific technical reasons, not just preference)

Add more options if we genuinely considered them. Don't invent options we didn't
discuss just to pad the section.

### Why We Chose [Option X]

Numbered list of concrete reasons. Each item should be:

- A bolded principle followed by a dash and a specific explanation
- Tied to real engineering concerns (maintainability, performance, correctness,
  developer experience, etc.)
- Not generic — each point should be directly traceable to this specific choice

If there are also disadvantages or trade-offs with the chosen approach, list
them honestly here. Use a "### Trade-offs" sub-heading if needed.

## Implementation

Show how the decision is actually implemented in our codebase:

- **Actual code snippets** with file paths in comments (e.g., `// src/utils/requireAuth.ts`)
- Focus on the relevant parts, trim unrelated lines with `// ...`
- If the implementation involves a flow or sequence of steps, use an ASCII flow
  diagram like this:

```
User logs in
    ↓
Step A happens
    ↓
Step B happens
    ↓
Outcome
```

Only include flow diagrams when the decision involves a sequence, state machine,
or data flow that's hard to understand from code alone. Don't add them for
simple structural decisions.

- If the decision involves comparing before/after states across multiple
  dimensions, use a comparison table:

| Aspect | Before | After |
|--------|--------|-------|
| ...    | ...    | ...   |

Only include tables when there are 3+ dimensions to compare. For simpler
decisions, prose is clearer.

## Related Files

Bulleted list of file paths that are relevant to this decision, with a brief
note about each file's role:

- `src/utils/requireAuth.ts` — Auth loader function
- `src/App.tsx` — Router configuration with loaders

This section helps me (or anyone else) quickly find the code when revisiting
the decision.

---

## Guidance on length and detail

The doc length should match the decision's complexity:

- **Simple decisions** (e.g., which pattern to use for a specific problem):
  Keep it short. Problem → Options → Choice → Implementation. Skip the flow
  diagram and table. Target ~80-120 lines.

- **Medium decisions** (e.g., auth strategy, error handling approach):
  Include flow diagrams or tables if they add clarity. Show code for both the
  chosen and rejected options. Target ~120-200 lines.

- **Large decisions** (e.g., framework migration, architecture change):
  These may need a Table of Contents, phased migration strategy, and an honest
  "Is this over-engineering?" assessment. But even large decisions should aim
  to be scannable — use the blockquote at the top so the answer is immediate.
  Target ~200-400 lines. If it's going longer than that, consider splitting
  into multiple decision docs.

## Style and tone guidelines

- Technical and direct — this is a reference doc, not a narrative
- Use "we" for decisions made collaboratively
- Code snippets should be real code from the codebase, not invented examples
- Headers should be descriptive and specific, never generic
- When comparing approaches, be honest about trade-offs in both directions —
  but don't invent advantages for a rejected approach if there aren't any
  (follow the same honesty principle as the course-correction docs: verify via
  internet search if you're unsure whether an approach is standard practice)
- The filename should use the next sequential prefix and kebab-case title, like
  `004-route-level-auth-guards.md`
