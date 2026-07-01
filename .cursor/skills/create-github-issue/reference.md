# GitHub Issue Reference — LoL Custom Duel Ledger

## Document map

| Document | Path |
|----------|------|
| Requirements (source of truth) | `docs/00-product/UserStories.md` |
| Milestones & MVP gates | `docs/00-product/Roadmap.md` |
| Architecture context | `docs/01-architecture/SystemArchitecture.md` |

## Requirement ID prefixes

| Prefix | GitHub label | Module |
|--------|--------------|--------|
| `REQ-CAP` | `area:capture` | `client/` |
| `REQ-SRV` | `area:server` | `server/` |
| `REQ-BOT` | `area:bot` | `frontend/bot/` |
| `REQ-TRU` | `area:trust` | cross-cutting |
| `REQ-OPS` | `area:ops` | infra / docs |

## One-time label setup

```bash
gh label create "P0" --color "B60205" --description "MVP requirement"
gh label create "P1" --color "D93F0B" --description "Post-MVP polish"
gh label create "P2" --color "FBCA04" --description "Nice-to-have"

gh label create "area:capture" --color "1D76DB" --description "LCU client"
gh label create "area:server" --color "5319E7" --description "API, worker, DB"
gh label create "area:bot" --color "0E8A16" --description "Telegram bot"
gh label create "area:trust" --color "C5DEF5" --description "Signing, credibility"
gh label create "area:ops" --color "EDEDED" --description "Operations, hosting"
```

## Milestones (align with Roadmap)

Create via GitHub UI or API when bootstrapping the repo:

| Title | Purpose |
|-------|---------|
| M1 — Capture path | LCU → server → PostgreSQL |
| M2 — Ledger correctness | Validation, dedupe, winner |
| M3 — Read path | Telegram P0 stats commands |
| M4 — Dogfood | Group uses MVP for real customs |

## Useful `gh` commands

```bash
# Search before create
gh issue list --search "REQ-SRV-06" --state all

# View issue
gh issue view 42

# Edit labels / milestone after create
gh issue edit 42 --add-label "P0" --milestone "M2 — Ledger correctness"

# Bulk list open P0
gh issue list --label "P0" --state open

# Close when done (prefer PR Closes #N instead)
gh issue close 42 --reason completed
```

## PR ↔ issue linkage

PR body should include:

```md
## Requirements
- REQ-SRV-06

Closes #42
```

GitHub auto-closes the issue on merge when `Closes #N` is in the PR description.

## Traceability checklist (Roadmap DoD)

A requirement is **done** when:

1. Merged PR references the `REQ-*` ID
2. Issue is closed via `Closes #N`
3. Acceptance criteria verified (tests or manual check recorded in PR)
