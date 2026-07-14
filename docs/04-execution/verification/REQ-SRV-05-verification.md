# REQ-SRV-05 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#22](https://github.com/st998814/LOL-Custom-Game-Logger/issues/22); branch `req-srv-05-enforce-1v1-team-unique`.

Related: [acceptance boundary](./REQ-SRV-05-acceptance-boundary.md)

## Acceptance Criteria Review

- [x] DB enforces at most one `match_players` row per `(gameId, teamId)`.
- [x] Persisting two players with the same `teamId` for one game is rejected.
- [x] Automated tests cover the duplicate-`teamId` failure path with no partial ledger rows.
- [x] Verification documented and traceable to this issue.

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `server/src/services/matchSnapshot.service.ts` | Fail-fast duplicate `teamId` guard | None |
| `server/src/services/matchSnapshot.service.test.ts` | Unit: duplicate `team_id` reject before DB | None |
| `server/tests/integration/matchSnapshot.integration.test.ts` | Live DB: reject leaves zero ledger rows | None |
| `docs/04-execution/verification/REQ-SRV-05-acceptance-boundary.md` | Assertion map vs sibling REQs | None |
| `docs/04-execution/verification/REQ-SRV-05-verification.md` | This report | None |
| `docs/00-product/UserStories.md` | Mark `REQ-SRV-05(Done)` (follow-up TODO) | None |

DB unique constraint was already present; this issue adds app fail-fast + automated proof.

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| Teams 100 + 200 | Integration (existing) | Two `MatchPlayer` rows | Yes |
| Both players same `team_id` | Unit + Integration | Throw; zero match / match_player rows | Yes |
| Schema `@@unique([gameId, teamId])` | Review | Present in schema + migration | Yes |
| Player fields / ingest 409 / winner | — | Out of scope | N/A |

## Test Plan

### Unit Tests (mocked DB)

- `server/src/services/matchSnapshot.service.test.ts` — duplicate `team_id` → clear error; no `findUnique` / `$transaction`.

### Integration Tests (live PostgreSQL)

- `server/tests/integration/matchSnapshot.integration.test.ts` via `npm run test:integration`.

### Manual Smoke

- Not re-run for this issue. Integration covers the duplicate-`teamId` ledger-empty path; happy-path 1v1 is already covered by existing live tests.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `server/src/services/matchSnapshot.service.test.ts` | Duplicate `team_id` reject before DB writes |
| `server/tests/integration/matchSnapshot.integration.test.ts` | Duplicate `team_id` → zero ledger rows |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Server unit tests | `cd server && npm test` | Pass — 35 passed (5 files) |
| Server integration | `cd server && npm run test:integration` | Pass — 7 passed, 2 skipped (live DB) |
| Acceptance boundary | [REQ-SRV-05-acceptance-boundary.md](./REQ-SRV-05-acceptance-boundary.md) | A/B checklist complete |

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | App owns 1v1 validation; DB unique is backstop |
| Security | Pass | No secrets in docs |
| Error Handling | Pass | Clear duplicate-`team_id` message before writes |
| Maintainability | Pass | Small guard + focused tests + verification docs |
| Performance | Pass | Unchanged (O(n) Set over two players) |
| Scope Control | Pass | CAP-04 / SRV-04 / SRV-06 / SRV-07 deferred |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test matrix covered (deferred items documented)
- [x] Unit + integration tests for duplicate `teamId`
- [x] Server unit tests pass
- [x] Server integration tests pass
- [x] Documentation updated (acceptance boundary, verification)
- [ ] `UserStories.md` marks `REQ-SRV-05(Done)` (next TODO)
- [ ] PR summary published with `Closes #22`

## Documentation Notes

### Deferred follow-ups

| Item | Requirement | Notes |
|------|-------------|-------|
| Ingest dedupe key | REQ-SRV-06 | HTTP `409` / raw-event unique key |
| Winner column | REQ-SRV-07 | Not in schema yet |

### ADR

- Not Required

## PR Summary

### What changed

- Added fail-fast duplicate `teamId` validation in `persistMatchSnapshot`.
- Added unit + integration coverage for reject-with-no-partial-rows.
- Documented acceptance boundary and verification for REQ-SRV-05.

### Why

- Closes REQ-SRV-05 / #22: enforce 1v1 per match via `(gameId, teamId)` uniqueness with automated proof.

### Tests

- `cd server && npm test` — 35 passed
- `cd server && npm run test:integration` — 7 passed, 2 skipped

### Risks

- Integration tests require `server/.env` (skipped in CI until workflow added).
- DB unique remains a backstop; production still depends on the migrated index.

### Notes for reviewer

- Constraint existed since first migration; this PR hardens the app path and closes the deferred D8 test gap from REQ-SRV-02.
- Client-side 2-player validation remains REQ-CAP-04 (already Done).

## Completion Decision

Status: **Ready for UserStories update + PR**

Reason: Issue #22 acceptance criteria covered by app guard, existing DB unique, new unit/integration tests, and verification docs.

Remaining work:

- Mark `REQ-SRV-05(Done)` in UserStories.
- Publish PR with `Closes #22`.
