Implement a plan from the `docs/potential-plans/` folder.

The user will provide a plan name or topic. Find the matching file in
`docs/potential-plans/` and read it.

## Before writing any code

1. **Read the plan doc fully.** Focus on these sections:
   - Problem Statement and Root Cause — understand what we're solving
   - The recommended option's implementation plan — this is the starting
     point, not a rigid script
   - Files to Modify — know the blast radius
   - Tests to Add — know what coverage is expected

2. **Check if the codebase has drifted.** The plan may have been written
   weeks or months ago. Before following the implementation steps:
   - Check that the files listed in "Files to Modify" still exist and
     haven't been significantly refactored
   - Check that the problem described in the plan still exists — it may
     have been partially or fully addressed by other work
   - Check for new patterns or conventions in the codebase that the plan
     didn't account for

3. **Flag any drift.** If the codebase has changed in ways that affect the
   plan, tell me before starting:
   - "The plan references `useRepoRadars` in `RepoCard.tsx` but that hook
     was renamed to `useRadarMembership`"
   - "The plan suggests creating `RepoCardSkeleton.tsx` but a skeleton
     component already exists at `src/components/Skeleton.tsx`"
   - "The problem described in the plan (radar icon flash) seems to have
     been addressed — `DynamicRadarIcon` no longer has the
     `userHasInteracted` flag"

   If the drift is minor (renames, moved files), adapt the plan and
   proceed. If the drift is significant (problem no longer exists, major
   refactor), stop and ask me how to proceed.

4. **Present an updated implementation plan.** Based on the plan doc and
   any drift you found, outline the steps you're going to take. This is
   where you adapt the plan doc's steps to the current state of the code.
   Keep it concise — a numbered list of what you'll do in order.

   Wait for my approval before writing code.

## While implementing

- Follow the plan's recommended approach unless drift makes it impractical
- Write tests as specified in the plan's "Tests to Add" section
- If you hit a problem the plan didn't anticipate, tell me and propose a
  fix rather than silently deviating
- When done, run the verification steps from the plan doc (if they exist)
  to confirm the implementation works

## After implementing

- Update the plan doc's status to `Implemented` and add today's date
- If the implementation deviated from the plan in meaningful ways, briefly
  note what changed and why at the bottom of the plan doc
