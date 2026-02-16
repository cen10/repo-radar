Create a document in `docs/agent-course-corrections/` about the conversation
we just had where I identified an issue with a decision you made and redirected
the approach.

**Important:** The `docs/` folder is symlinked and not checked into git. It
exists locally at the workspace root but glob/grep won't find it through the
worktree. To check existing files, use bash directly with the current working
directory: `ls $CWD/docs/agent-course-corrections/`

Before creating the file, list existing files to find the highest numeric prefix
(e.g., if `003-fixture-chaining-pattern.md` exists, the next file should start
with `004-`). Zero-pad to three digits.

This doc is for interview prep. I expect to be asked how I work with AI agents,
and I want concrete examples showing that I review code critically, catch
problems, and drive better outcomes. Write it so I can skim it before an
interview and quickly recall the full context.

Use this exact structure:

---

# [Descriptive Title]: [Specific Technique or Change]

The title should name the concern and the action taken, not just the topic.
Good: "Fixture Organization: Separating Auth from Page Objects"
Bad: "Test Fixture Refactor"

## Context

1-3 sentences. What feature or task were we working on, and why. Set the scene
so a reader unfamiliar with the project can follow the rest of the doc.

## Original Approach: [Short Description]

Explain what you initially proposed or implemented. Include:

- The reasoning behind the original approach (make it clear it wasn't arbitrary)
- **Actual code snippets** showing the implementation (not pseudocode)
- Keep code focused on the relevant parts, trimming unrelated lines with `// ...`

### The Problem

What I noticed was wrong, suboptimal, or risky. Be specific about:

- What I said or asked that surfaced the issue
- The concrete technical concern (not just "it felt wrong")
- Why this would matter as the codebase grows or in a team context

## Improved Approach: [Short Description]

Explain what we changed to. Include:

- **Actual code snippets** showing the new implementation
- If multiple files changed, show each one with its filepath in a comment
- Highlight the structural differences from the original, not just the syntax

### Why This Is Better

Numbered list of concrete benefits. Each item should be:

- A bolded principle followed by a dash and a specific explanation
- Tied to real software engineering concerns (maintainability, discoverability,
  scalability, single responsibility, etc.)
- Not generic — each point should be clearly traceable to this specific change

## Key Insight

Frame this as the core question or observation that triggered the change. Often
works well as an italicized question followed by a short paragraph. This is the
"soundbite" I'd use in an interview to explain my thinking.

## Trade-offs and Alternatives

This section depends on whether the original approach was a legitimate
alternative or a genuine mistake. Be honest about which case it is.

**If the original approach was a valid alternative** (it works, people use it in
real codebases, but has different trade-offs), use this structure:

**[Improved approach] (preferred when):**

- Conditions where this is the clear winner

**[Original approach] (acceptable when):**

- Conditions where the simpler approach is genuinely fine

**If the original approach was incorrect or non-standard** (not how the
library/tool is designed to be used, would confuse experienced developers,
or goes against established conventions), be direct about that:

**Why the original approach isn't viable:**

- Explain specifically why it's not a real option (e.g., "Playwright fixtures
  are designed to be chained — composing them via spread is undocumented and
  fragile")
- Don't invent scenarios where it would be acceptable if there aren't any

**Real alternatives:**

- Present the actual options an experienced developer would consider
- Explain when you'd pick each one

The goal is to show honest technical judgment. Interviewers are more impressed
by "that approach doesn't work because X, the real choice is between Y and Z"
than by a forced both-sides framing.

## Code Diff Summary

Show compact diffs (` ```diff `) summarizing the actual file changes.
Group by file. Use `+ / -` diff markers. Collapse function bodies to `{ ... }`
when the structure is what matters, not the implementation detail.

End with one sentence summarizing the scope of the change (e.g., number of
files touched, lines changed, or what was added/removed).

---

## Style and tone guidelines

- Conversational but technically precise
- Write in third person for what the agent did, first person for what I did
  (e.g., "The initial implementation put everything in a single file" vs.
  "The question that prompted this refactor")
- Code snippets should be real code from our conversation, not invented examples
- Headers should be descriptive and specific, never generic
- Aim for a doc that takes 2-3 minutes to read — detailed enough to jog my
  memory, short enough that I'll actually re-read it before an interview
- The filename should use the next sequential prefix and kebab-case title, like
  `004-fixture-organization-separating-auth-from-page-objects.md`
