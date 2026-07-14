# REQ-SRV-04 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#21](https://github.com/st998814/LOL-Custom-Game-Logger/issues/21); branch `req-srv-04-verify-player-fields`.

Related: [acceptance boundary](./REQ-SRV-04-acceptance-boundary.md)

## Acceptance Criteria Review

- [x] Persisted `Player` / `MatchPlayer` rows include `puuid`, `gameName`, `tagLine`, `championId`, `firstBlood`, `firstTower`, `totalCs`, `teamId` from the snapshot.
- [x] Empty string and all-zero `puuid` are stored as `null`.
- [x] Automated tests cover happy-path field mapping and puuid normalization.
- [x] Verification documented and traceable to this issue.

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `server/src/services/matchSnapshot.service.test.ts` | Unit cases for empty / all-zero `puuid` → null create | None |
| `server/tests/integration/matchSnapshot.integration.test.ts` | Live DB null-puuid + player field asserts | None |
| `docs/04-execution/verification/REQ-SRV-04-acceptance-boundary.md` | Assertion map vs sibling REQs | None |
| `docs/04-execution/verification/REQ-SRV-04-verification.md` | This report | None |
| `docs/00-product/UserStories.md` | Mark `REQ-SRV-04(Done)` (follow-up TODO) | None |

No schema or persistence service changes — behavior already landed under REQ-SRV-02; null-puuid tests were deferred there (C5).

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| Fixture players → eight REQ fields | Unit + Integration | Values match payload | Yes |
| `puuid: ""` | Unit + Integration | `Player.puuid = null`; other fields stored | Yes |
| `puuid` matching `/^0+$/` | Unit + Integration | `Player.puuid = null` via `create` | Yes |
| Real `puuid` | Unit + Integration | Upsert by `puuid` | Yes |
| Match fields / ingest 409 / winner | — | Out of scope | N/A |

## Test Plan

### Unit Tests (mocked DB)

- `server/src/services/matchSnapshot.service.test.ts` — player field mapping, empty/all-zero puuid create path.

### Integration Tests (live PostgreSQL)

- `server/tests/integration/matchSnapshot.integration.test.ts` via `npm run test:integration`.

### Manual Smoke

- Not re-run for this issue. Prior [REQ-SRV-02 manual smoke](./REQ-SRV-02-manual-smoke.md) already proved live player-field writes; new integration case covers null-puuid normalization.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `server/src/services/matchSnapshot.service.test.ts` | Empty `puuid`; all-zero `puuid` → `player.create` with `puuid: null` |
| `server/tests/integration/matchSnapshot.integration.test.ts` | Live DB: empty + all-zero → null; other REQ fields intact |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Server unit tests | `cd server && npm test` | Pass — 34 passed (5 files) |
| Server integration | `cd server && npm run test:integration` | Pass — 6 passed, 2 skipped (live DB) |
| Acceptance boundary | [REQ-SRV-04-acceptance-boundary.md](./REQ-SRV-04-acceptance-boundary.md) | A/B checklist complete |

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Persistence remains in `matchSnapshot.service`; no new layer |
| Security | Pass | No secrets in docs |
| Error Handling | Pass | Normalization is deterministic; no new failure modes |
| Maintainability | Pass | Focused unit + integration gap fill + verification docs |
| Performance | Pass | Unchanged |
| Scope Control | Pass | Team uniqueness, ingest dedupe, winner deferred |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test matrix covered (deferred items documented)
- [x] Unit + integration tests added for null puuid
- [x] Server unit tests pass
- [x] Server integration tests pass
- [x] Documentation updated (acceptance boundary, verification)
- [ ] `UserStories.md` marks `REQ-SRV-04(Done)` (next TODO)
- [ ] PR summary published with `Closes #21`

## Documentation Notes

### Deferred follow-ups

| Item | Requirement | Notes |
|------|-------------|-------|
| 1v1 team constraint | REQ-SRV-05 | DB unique on `(gameId, teamId)` |
| Ingest dedupe key | REQ-SRV-06 | HTTP `409` / raw-event unique key |
| Winner column | REQ-SRV-07 | Not in schema yet |

### ADR

- Not Required

## PR Summary

### What changed

- Added unit + integration coverage for empty / all-zero `puuid` → `null`.
- Documented acceptance boundary and verification for REQ-SRV-04.

### Why

- Closes REQ-SRV-04 / #21: prove per-player fields are stored and placeholder puuids normalize to null.

### Tests

- `cd server && npm test` — 34 passed
- `cd server && npm run test:integration` — 6 passed, 2 skipped

### Risks

- Integration tests require `server/.env` (skipped in CI until workflow added).
- Hyphenated all-zero UUID strings are not matched by `/^0+$/`; Product note targets empty/`0000…` digit strings.

### Notes for reviewer

- Persistence implementation was already complete under REQ-SRV-02; this issue closes the deferred null-puuid test gap.
- `(gameId, teamId)` uniqueness remains REQ-SRV-05.

## Completion Decision

Status: **Ready for UserStories update + PR**

Reason: Issue #21 acceptance criteria covered by existing persistence, new null-puuid tests, live integration, and verification docs.

Remaining work:

- Mark `REQ-SRV-04(Done)` in UserStories.
- Publish PR with `Closes #21`.
