---
name: publish-pull-request
description: Publishes traceable GitHub pull requests linked to REQ-* requirements and closing issues. Use when opening a PR, publishing work for review, after verification is complete, or when the user asks to create or submit a pull request.
---

# Publish Pull Request

## Purpose

Publish a **review-ready pull request** that closes a GitHub issue and proves which `REQ-*` requirements are satisfied.

PRs are the proof step in the pipeline:

```text
Issue (REQ-*) → Plan → Implement → Verify → PR → Merge → Requirement done
```

---

## When to Use

Use when the user asks to:

- Open, publish, or create a pull request
- Submit work for review after implementation
- Close an issue via `Closes #N`

Run **verification-and-testing** first (or confirm verification already passed). Do not publish a PR while lint, tests, or typecheck are failing unless the user explicitly accepts that.

Do **not** use for filing issues — use **create-github-issue**.

---

## Required Inputs

| Input | Source |
|-------|--------|
| Requirement ID(s) | Issue body, branch context, or `docs/00-product/UserStories.md` |
| Linked issue number | `gh issue view` or user |
| Verification results | verification-and-testing output or manual confirmation |
| Changed files / diff | `git diff` |
| Base branch | Usually `main` or `master` |

---

## Workflow

### 1. Pre-flight checklist

Before creating the PR, confirm:

```md
## Pre-flight

- [ ] Linked issue exists and is open (or user waived issue)
- [ ] Requirement ID(s) identified (`REQ-*`)
- [ ] Verification completed (tests/lint/build or documented N/A)
- [ ] Changes are committed (not only unstaged)
- [ ] Branch is pushed or ready to push
- [ ] No secrets or `.env` files in the diff
```

If verification failed, stop and fix or report blockers.

---

### 2. Gather git state

Run in parallel:

```bash
git status
git diff
git branch -vv
git log --oneline -10
git diff main...HEAD
```

Replace `main` with the repo's default branch if different (`git symbolic-ref refs/remotes/origin/HEAD`).

Identify:

- Commits included in the PR
- Whether the branch tracks a remote
- Scope of changes vs. the stated requirement(s)

---

### 3. Resolve traceability

Match the PR to requirements and the issue:

```bash
gh issue view <N>
```

**Output:**

```md
## Traceability

| Field | Value |
|-------|-------|
| Primary REQ | REQ-CAP-01 |
| Issue | #12 |
| Issue type | Complete / Implement / Harden / Polish |
| Epic | US-1 |
```

**Title format:** `REQ-XXX-NN: Short description`

Examples:

- `REQ-CAP-04: Validate 2-player duel before send`
- `REQ-CAP-01: Document host capture workflow`

For multiple requirements, use the **primary** ID in the title; list all IDs in the body.

---

### 4. Draft the PR body

Use this template:

```md
## Requirements

- [REQ-CAP-01](docs/00-product/UserStories.md#duel-capture) — verify and document host workflow
- Closes #12

## Summary

Brief description of what this PR does and why.

## What changed

- 
- 

## Verification

| Check | Command | Result |
|-------|---------|--------|
| Lint | | Pass / Fail / N/A |
| Typecheck | | Pass / Fail / N/A |
| Tests | | Pass / Fail / N/A |
| Build | | Pass / Fail / N/A |
| Manual smoke | | Pass / Fail / N/A |

### Manual smoke (if applicable)

Steps and result (date, environment, League version if relevant).

## Acceptance criteria

- [ ] Criterion from issue — how this PR satisfies it
- [ ] 

## Risks

- None / describe

## Notes for reviewer

- 
```

**Complete** issues (code already existed): emphasize verification and docs in Summary and Manual smoke; small diffs are expected.

**Implement** issues: emphasize behavior change and automated tests.

Always include `Closes #N` so GitHub auto-closes the issue on merge.

---

### 5. Push and create the PR

Push if needed:

```bash
git push -u origin HEAD
```

Create with `gh`:

```bash
gh pr create \
  --title "REQ-CAP-01: Document host capture workflow" \
  --body "$(cat <<'EOF'
## Requirements

- REQ-CAP-01
- Closes #12

...
EOF
)"
```

Optional:

```bash
gh pr create --draft   # if user wants draft first
gh pr create --base main
```

---

### 6. Confirm publication

**Output:**

```md
## Pull Request Published

- **URL:** (gh pr create output)
- **Title:** REQ-CAP-01: ...
- **Closes:** #12
- **Requirements:** REQ-CAP-01
```

Return the PR URL to the user.

---

## PR types (match issue maturity)

| Issue type | PR expectations |
|------------|-----------------|
| **Complete** | Docs + manual smoke notes; may be thin |
| **Implement** | Code + tests mapping to acceptance criteria |
| **Harden** | Tests/fixtures; minimal behavior change |
| **Polish** | Incremental improvement; link P1/P2 REQ |

---

## Rules

- Every PR lists at least one `REQ-*` ID and `Closes #N` when an issue exists.
- Title starts with the primary requirement ID.
- Do not publish if verification is failing unless the user explicitly requests a draft/WIP PR.
- Never include secrets in commits or PR description.
- Use `gh` for all GitHub operations.
- Do not force-push to `main`/`master`.
- Prefer focused PRs; if scope grew beyond the issue, note extra changes or split before publish.

---

## Handoffs

| Prior step | Skill |
|------------|-------|
| Issue filed | create-github-issue |
| Plan | implement-feature |
| Verify | verification-and-testing |
| After merge | Requirement done per Roadmap DoD |

---

## Additional resources

- `gh` commands and branch conventions: [reference.md](reference.md)
- Filled PR examples: [examples.md](examples.md)
