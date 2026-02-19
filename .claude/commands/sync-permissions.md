Sync local Claude permissions to global settings.

## How it works

1. Read the local permissions file: `.claude/settings.local.json`
2. Read the global permissions file: `~/.claude/settings.json`
3. Compare the `permissions.allow` arrays
4. Identify entries in local that are NOT covered by global (accounting for wildcards like `Bash(git *)` covering `Bash(git status)`)

## What to ignore

Skip these types of local entries — they're junk or one-offs:
- Broken fragments (e.g., `Bash(for i in 1 2 3)`, `Bash(do echo ...)`, `Bash(done)`)
- Specific command invocations that should have been wildcards (e.g., a full `git commit -m "..."` with a specific message)
- Entries that are redundant with another local entry (e.g., `Bash(xargs sed:*)` when `Bash(xargs:*)` exists)

## What to flag for syncing

Flag entries that are:
- Generally useful across projects (common bash commands, useful domains)
- MCP tool patterns that should be wildcarded globally

## Output format

Show the user a summary:

```
## Local permissions to sync to global

**Recommended to add:**
- `Bash(foo *)` — [brief reason why it's generally useful]
- `WebFetch(domain:example.com)` — [brief reason]

**Project-specific (keep local only):**
- `WebFetch(domain:project-specific-docs.io)` — only relevant to this project

**Junk to remove from local:**
- `Bash(broken fragment...)` — not a valid permission
```

## After showing the summary

Ask: "Want me to add the recommended items to global and clean up local?"

If yes:
1. Add recommended items to `~/.claude/settings.json` permissions.allow array
2. Remove junk entries from `.claude/settings.local.json`
3. Optionally remove entries from local that are now covered by global (to reduce duplication)

If no, do nothing.
