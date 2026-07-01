---
name: create-github-issue
description: Creates well-formed GitHub issues traced to REQ-* requirements in UserStories.md. Use when opening a backlog item, filing a bug, starting work on a P0/P1/P2 requirement, or when the user asks to create or establish a GitHub issue.
---

# Create GitHub Issue

## Purpose

Turn a product requirement (`REQ-*`, `UC-*`, or `US-*`) into a **traceable GitHub issue** that implementation PRs can close.

Issues are the bridge between [UserStories.md](../../docs/00-product/UserStories.md) and merged code.

---

## When to Use

Use when the user asks to:

- Create or open a GitHub issue
- File a backlog item for a requirement
- Start tracking `REQ-CAP-04`, `REQ-SRV-06`, or any requirement ID
- Break MVP milestones into actionable issues

Do **not** use for pull requests — use the PR workflow after the issue exists.

---

## Required Inputs

Collect or infer:

| Input | Source |
|-------|--------|
| Requirement ID(s) | `docs/00-product/UserStories.md` |
| Priority (P0/P1/P2) | Requirement row in UserStories |
| User story epic (`US-1` / `US-2`) | Requirement row |
| Task description + notes | Requirement row |
| Milestone (optional) | `docs/00-product/Roadmap.md` (M1–M4) |

If the user describes work without an ID, map it to the closest `REQ-*` or state that a new requirement row is needed first.

---

## Workflow

### 1. Resolve the requirement

Read `docs/00-product/UserStories.md` and copy the exact row for each ID.

**Output:**

```md
## Requirement Resolution

| ID | Tier | Task | User story | Notes |
|----|------|------|------------|-------|
|    |      |      |            |       |
```

If no matching ID exists, stop and ask whether to add a row to UserStories first.

---

### 2. Check for duplicates

Before creating, search existing issues:

```bash
gh issue list --search "REQ-CAP-04 in:title,body" --state all --limit 10
```

If an open issue already tracks the same ID, report it and do not create a duplicate. If closed and work is incomplete, reopen or create a follow-up with a new title suffix (e.g. `REQ-CAP-04 (retry)`).

---

### 3. Map milestone and labels

| Roadmap milestone | Typical requirement prefixes |
|-------------------|------------------------------|
| M1 — Capture path | `REQ-CAP-*`, `REQ-SRV-01`–`REQ-SRV-02` |
| M2 — Ledger correctness | `REQ-CAP-04`, `REQ-SRV-03`–`REQ-SRV-07` |
| M3 — Read path | `REQ-BOT-*` (P0) |
| M4 — Dogfood | `REQ-OPS-*` (P0), vertical slice |

**Labels** (create once if missing; see [reference.md](reference.md)):

- Priority: `P0`, `P1`, `P2`
- Area: `area:capture`, `area:server`, `area:bot`, `area:trust`, `area:ops`

---

### 4. Draft the issue body

Use this template. Every issue must name at least one requirement ID.

```md
## Requirement

- **ID:** REQ-CAP-04
- **Epic:** US-1
- **Priority:** P0
- **Source:** [UserStories — Duel capture](docs/00-product/UserStories.md#duel-capture)

## Summary

Client validates the game is a 2-player duel before sending. Reject if `participantIdentities.length ≠ 2`.

## Acceptance criteria

- [ ] Criterion derived from requirement task text
- [ ] Criterion derived from Notes column
- [ ] Edge case or rejection behavior stated explicitly

## Affected modules

- [ ] `client/` — list files or modules
- [ ] `server/`
- [ ] `frontend/bot/`
- [ ] Docs / tests only

## Test plan

| Scenario | Type | Expected |
|----------|------|----------|
|          | Unit / Integration / Manual | |

## Links

- Roadmap milestone: M2
- Related requirements: (optional)
```

Adapt acceptance criteria from the requirement **Task** and **Note** columns — do not invent scope beyond UserStories unless the user explicitly adds it.

---

### 5. Create the issue

**Title format:** `REQ-XXX-NN: Short task title`

Example: `REQ-CAP-04: Validate 2-player duel before send`

Create with `gh` (HEREDOC for body):

```bash
gh issue create \
  --title "REQ-CAP-04: Validate 2-player duel before send" \
  --label "P0" --label "area:capture" \
  --body "$(cat <<'EOF'
## Requirement

- **ID:** REQ-CAP-04
...
EOF
)"
```

Add milestone when it exists:

```bash
gh issue create ... --milestone "M2 — Ledger correctness"
```

List milestones: `gh api repos/{owner}/{repo}/milestones --jq '.[].title'`

---

### 6. Confirm traceability

After creation, output:

```md
## Issue Created

- **URL:** https://github.com/...
- **ID:** REQ-CAP-04
- **Next step:** Run implement-feature skill, then open a PR with `Closes #N`
```

---

## Issue granularity

| Strategy | When |
|----------|------|
| **One issue per `REQ-*`** | Default for P0; clearest traceability |
| **One issue, multiple `REQ-*`** | Tightly coupled slice (e.g. ingest path); list all IDs in body |
| **Bug / tech debt** | No `REQ-*`; use `BUG:` or `TECH:` prefix and link related REQ if any |

---

## Rules

- Every implementation issue references at least one ID from UserStories (`REQ-*` preferred).
- Title starts with the primary requirement ID.
- Do not create duplicate issues for the same open requirement.
- Use `gh` for all GitHub operations.
- P0 issues must have testable acceptance criteria before creation.
- Do not start coding in this skill — hand off to **implement-feature** after the issue exists.

---

## Handoffs

| Next step | Skill / action |
|-----------|----------------|
| Plan implementation | `implement-feature` |
| Verify and PR | `verification-and-testing` |
| PR body | Include `Closes #N` and repeat `REQ-*` IDs |

---

## Additional resources

- Label and milestone setup: [reference.md](reference.md)
- Filled examples: [examples.md](examples.md)
