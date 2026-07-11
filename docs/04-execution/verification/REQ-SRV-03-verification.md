# REQ-SRV-03 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#19](https://github.com/st998814/LOL-Custom-Game-Logger/issues/19); branch `req-srv-03-verify-match-fields`.

Related: [acceptance boundary](./REQ-SRV-03-acceptance-boundary.md)

## Acceptance Criteria Review

- [x] Persisted match rows include `gameId`, `gameDuration`, and `gameCreationDate` from the snapshot.
- [x] `gameId` is the Match primary key (one row per game).
- [x] Re-persisting the same `gameId` is rejected and does not create a second match row.
- [x] Automated tests cover the happy path, duplicate rejection, and missing basic match fields.
- [x] Verification documented and traceable to this issue.

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `server/src/services/matchSnapshot.service.test.ts` | Unit cases for missing `game_id` / `game_duration` | None |
| `docs/04-execution/verification/REQ-SRV-03-acceptance-boundary.md` | Assertion map vs sibling REQs | None |
| `docs/04-execution/verification/REQ-SRV-03-verification.md` | This report | None |
| `docs/00-product/UserStories.md` | Mark `REQ-SRV-03(Done)` (follow-up TODO) | None |

No schema or persistence service changes — behavior already landed under REQ-SRV-02.

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| Persist fixture → match fields | Unit + Integration | Row has correct `gameId`, `gameDuration`, `gameCreationDate` | Yes |
| Same `gameId` twice | Unit + Integration | Throw; still one match row | Yes |
| Missing `game_id` | Unit | `missing basic match fields`; no DB write | Yes |
| Missing `game_duration` | Unit | `missing basic match fields`; no DB write | Yes |
| Invalid `game_creation_date` | Unit | Throw; no DB write | Yes |
| Missing `match` object | Unit | Throw early | Yes |
| Schema: `gameId` is `@id` | Review | PK on `matches.game_id` | Yes |
| Ingest-key duplicate (HTTP) | — | Deferred `REQ-SRV-06` | N/A |
| Player field mapping | — | Deferred `REQ-SRV-04` | N/A |

## Test Plan

### Unit Tests (mocked DB)

- `server/src/services/matchSnapshot.service.test.ts` — field persistence, missing fields, invalid date, duplicate reject.

### Integration Tests (live PostgreSQL)

- `server/tests/integration/matchSnapshot.integration.test.ts` via `npm run test:integration`.

### Manual Smoke

- Not re-run for this issue. Prior [REQ-SRV-02 manual smoke](./REQ-SRV-02-manual-smoke.md) already proved live DB writes of core match fields; integration tests cover REQ-SRV-03 field + duplicate assertions.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `server/src/services/matchSnapshot.service.test.ts` | Missing `game_id`; missing `game_duration` |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Server unit tests | `cd server && npm test` | Pass — 32 passed (5 files) |
| Server integration | `cd server && npm run test:integration` | Pass — 5 passed, 2 skipped (live DB) |
| Acceptance boundary | [REQ-SRV-03-acceptance-boundary.md](./REQ-SRV-03-acceptance-boundary.md) | A/B checklist complete |

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Persistence remains in `matchSnapshot.service`; no new layer |
| Security | Pass | No secrets in docs |
| Error Handling | Pass | Missing fields and duplicates fail before / without second write |
| Maintainability | Pass | Focused unit gap fill + verification docs |
| Performance | Pass | Unchanged |
| Scope Control | Pass | Player fields, ingest dedupe, winner deferred |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test matrix covered (deferred items documented)
- [x] Unit tests added for missing basic match fields
- [x] Server unit tests pass
- [x] Server integration tests pass
- [x] Documentation updated (acceptance boundary, verification)
- [ ] `UserStories.md` marks `REQ-SRV-03(Done)` (next TODO)
- [ ] PR summary published with `Closes #19`

## Documentation Notes

### Deferred follow-ups

| Item | Requirement | Notes |
|------|-------------|-------|
| Per-player fields | REQ-SRV-04 | Covered by existing persist path; separate issue |
| 1v1 team constraint | REQ-SRV-05 | DB unique on `(gameId, teamId)` |
| Ingest dedupe key | REQ-SRV-06 | Distinct from Match PK rejection |
| Winner column | REQ-SRV-07 | Not in schema yet |

### ADR

- Not Required

## PR Summary

### What changed

- Added unit coverage for missing `game_id` / `game_duration` on match snapshot persistence.
- Documented acceptance boundary and verification for REQ-SRV-03.

### Why

- Closes REQ-SRV-03 / #19: prove per-match fields are stored and duplicate `gameId` is rejected.

### Tests

- `cd server && npm test` — 32 passed
- `cd server && npm run test:integration` — 5 passed, 2 skipped

### Risks

- Integration tests require `server/.env` (skipped in CI until workflow added).

### Notes for reviewer

- Persistence implementation was already complete under REQ-SRV-02; this issue is Complete/verify with one unit gap filled.
- Ingest-level dedupe remains REQ-SRV-06.

## Completion Decision

Status: **Ready for UserStories update + PR**

Reason: Issue #19 acceptance criteria covered by existing persistence, new missing-field unit tests, live integration, and verification docs.

Remaining work:

- Mark `REQ-SRV-03(Done)` in UserStories.
- Publish PR with `Closes #19`.
