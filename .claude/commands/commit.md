Bump the app version in lib/version.ts and then commit staged changes.

Optional argument: Work item reference (e.g., `/commit DOINT-123` or `/commit #123`)
- If provided, prefix the commit message with the reference
- The argument is: $ARGUMENTS

## Step 1 — Determine version bump

Read lib/version.ts to get the current version. Then run `git diff --cached` to inspect all staged changes.

Based on the staged diff, decide:
- **major** — breaking changes or complete rewrites of a feature
- **minor** — new user-visible functionality added
- **patch** — bug fixes, copy changes, styling tweaks, refactors with no behavior change, dependency bumps

Increment the appropriate part of the semver and reset lower parts to zero (e.g. minor bump: 1.3.4 → 1.4.0).

## Step 2 — Update version file

Edit lib/version.ts so `APP_VERSION` reflects the new version. Stage lib/version.ts with `git add lib/version.ts`.

Tell the user: `Version bumped: {old} → {new} ({bump type})`

## Step 3 — Commit

Generate a commit message for all staged changes (including the version bump):
- Focus on the "why" rather than the "what"
- Keep it concise (1-2 sentences)
- Follow the repository's existing commit message style
- DO NOT mention co-authoring with AI or Claude Code
- If a work item reference was provided as argument, prefix the message with it

Commit all staged changes.
