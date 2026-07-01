# Publish PR Reference — LoL Custom Duel Ledger

## Document map

| Document | Path |
|----------|------|
| Requirements | `docs/00-product/UserStories.md` |
| Roadmap DoD | `docs/00-product/Roadmap.md` |
| Related skills | `.cursor/skills/create-github-issue/`, `implement-feature/`, `verification-and-testing/` |

## Default verification commands

Run what exists for the changed area:

```bash
# Server (TypeScript)
cd server && npm test && npm run build

# Client (Python) — when pytest is configured
cd client && uv run pytest

# Lint — when configured
```

Record Pass / Fail / N/A in the PR body. Do not omit failed checks.

## Branch naming (recommended)

```text
req-cap-01-host-workflow
req-cap-04-two-player-validation
req-srv-06-dedupe-ingest
```

Not required, but helps scan branches against requirements.

## Useful `gh` commands

```bash
# Default branch
git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'

# Create PR
gh pr create --title "..." --body "$(cat <<'EOF'
...
EOF
)"

# Draft PR
gh pr create --draft --title "..." --body "..."

# View after create
gh pr view --web

# Link PR to issue manually (if Closes #N omitted)
gh pr edit <PR> --body "$(gh pr view <PR> --json body -q .body)

Closes #12"

# Check CI
gh pr checks
```

## Traceability (Roadmap DoD)

A requirement is **done** after merge when:

1. PR title/body reference the `REQ-*` ID
2. `Closes #N` merged → issue closed
3. Verification recorded in PR (tests or manual smoke)

## PR template vs issue template

| Section | Issue | PR |
|---------|-------|-----|
| Current state | Yes | No — use "What changed" |
| Remaining gap | Yes | No — work is done |
| Verification | Test plan (future) | Test results (actual) |
| Closes #N | No | **Yes** |

## Optional: repo PR template

To enforce structure in GitHub UI, add `.github/pull_request_template.md` mirroring the skill body template. The skill works with or without it.
