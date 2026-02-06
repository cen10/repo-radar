Create an explanatory reference document based on what we just discussed. This
is a doc I'll come back to when I've forgotten how something works or need to
quickly refresh my understanding before working on related code.

Before creating the file, determine which category folder under `docs/` it
belongs in based on the primary topic. Current folders include:

- `react/` — React patterns, hooks, state management, TanStack Query
- `typescript/` — TypeScript concepts, type patterns, language features
- `supabase/` — Supabase client, queries, RLS, database operations
- `performance/` — Performance patterns, observers, optimization
- `ui/` — UI components, accessibility, animations, Headless UI
- `testing/` — Testing strategies, mocking patterns, E2E approaches
- `architecture/` — System-level design, infrastructure choices
- `auth/` — Authentication flows, token management, sessions

If the topic doesn't fit an existing folder, create a new one with a clear,
lowercase name.

Use the filename format `kebab-case-topic.md` (e.g., `forwardref-explained.md`,
`intersection-observer.md`). Before creating the file, check the existing files in that
directory to find the highest numeric prefix (e.g., if `003-fixture-chaining-pattern.md`
exists, the next file should start with `004-`). Zero-pad to three digits.

---

## Determine the doc shape

These docs come in three shapes. Pick the one that fits based on what we
discussed, then follow its structure below:

### Shape 1: Concept Explainer

Use when I asked "what is X?" or "how does X work?" and the answer is a
general concept (not specific to our codebase), even if we discussed it in
the context of our code.

Examples: forwardRef, assertion functions, structural typing,
IntersectionObserver

### Shape 2: System Doc

Use when the topic is about how something works specifically in our codebase
— a system, data flow, or integration we built. The concept may be general
but the doc is about our implementation.

Examples: our caching strategy, our auth flow, our state management
architecture, how our E2E auth mocking works

### Shape 3: Quick Reference

Use when I asked about multiple related patterns or APIs from the same
tool/library and want a cheat sheet I can scan quickly.

Examples: Supabase query builder, PostgreSQL column types, TypeScript
operators, Headless UI components

---

## Shape 1: Concept Explainer

```markdown
# [Concept Name] Explained

## The Problem

What situation makes this concept necessary? Start with a concrete code
example showing the problem — ideally from our codebase. If the concept is
general, use a simplified example that shows what goes wrong without it.

## The Solution: [Concept Name]

Explain the concept by showing how it solves the problem above. Include:

- A code example showing the fix (real code from our codebase when possible)
- A brief explanation of the mechanism (what's happening under the hood)

## How to [Do the Thing]

Step-by-step with code. Show a before/after if the concept involves
converting or refactoring existing code. Label each change clearly.

## [Language/Framework]-Specific Details

If there are TypeScript types, React-specific patterns, or tool-specific
syntax involved, show them here with the exact signatures.

## When Do You Need [This Concept]?

**Good for:**

- Bulleted list of concrete scenarios (not abstract principles)

**Not needed for:**

- Scenarios where the simpler approach works fine

## Summary

3-5 bullet points. Each one sentence. This is what I'll read if I only
have 30 seconds.
```

---

## Shape 2: System Doc

```markdown
# [System/Feature Name]

## Overview

2-3 sentences explaining what this system does and why it exists. If this
doc relates to other docs, add a cross-reference callout:

> **Note:** This document covers [specific scope]. For [related topic],
> see [other-doc.md](./other-doc.md).

## The Problem [We Were Solving]

What drove us to build this. Be specific — not "we needed caching" but
"GitHub's API rate limits us to 5,000 requests/hour and users with 500+
stars would exhaust that in a single session."

## How It Works

Start with an ASCII flow diagram if the system involves a sequence of
steps, data flowing between components, or multiple layers:

(diagram here)

Then explain each step with code snippets from the actual codebase.
Include file paths in comments.

If the system has configuration or key parameters, use a table:

| Parameter | Value | Why |
| --------- | ----- | --- |

## [Specific Subsection Based on What We Discussed]

Add subsections for specific behaviors, edge cases, or scenarios we talked
through. Name each one descriptively — not "Details" but "Why We Don't
Invalidate the Bulk Cache on Star/Unstar."

## When to Use [This Pattern/System]

Practical guidance for future-me or anyone extending this code.

## Related Files

- `src/path/to/file.ts` — Brief role description

## Related Docs

- [doc-name.md](./doc-name.md) — One-line description of relationship
```

---

## Shape 3: Quick Reference

```markdown
# [Tool/Library] Quick Reference

One-line description of what this covers and when to reach for this doc.

If related docs exist for the same tool, add a cross-reference:

> For [related aspect], see [other-doc.md](./other-doc.md).

---

## [Concept/Pattern Group 1]

Brief explanation (1-3 sentences), then code:

(code example)

If comparing options, use a table:

| Option | What It Does | When to Use |
| ------ | ------------ | ----------- |

---

## [Concept/Pattern Group 2]

(same pattern — brief explanation, code, optional table)

---

(continue for each concept group, separated by horizontal rules)

## Related Docs

- [doc-name.md](./doc-name.md) — relationship description
```

---

## Style and tone guidelines (all shapes)

- Write for someone (me) who understood this 10 minutes ago but will have
  forgotten the details in 2 weeks
- Lead with the problem or motivation, not the definition — "why do I care"
  before "what is it"
- Use code from our actual codebase whenever the concept was discussed in
  context of our code. Include file paths in comments
- When showing code, keep examples focused — trim unrelated lines with
  `// ...` and only show what's needed to understand the concept
- Use ASCII flow diagrams for sequences and data flows, comparison tables
  for options with 3+ dimensions, neither when they don't add clarity
- Cross-reference related docs when they exist — check the docs/ directory
  before creating the file
- Keep the tone technical and direct. Not a tutorial for beginners, but a
  reference for someone who has seen this before and needs a refresher
- Quick references should be scannable — someone looking for one specific
  pattern should find it in under 10 seconds
- Concept explainers and system docs should take 2-4 minutes to read fully
