# REQ-SRV-07 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#24](https://github.com/st998814/LOL-Custom-Game-Logger/issues/24); branch `req-srv-07-derive-store-winner`.

Related: [acceptance boundary](./REQ-SRV-07-acceptance-boundary.md) · [DEC-001](../../05-knowledge/Decisions.md#dec-001--custom-duel-win-judgement)

## Acceptance Criteria Review

- [x] Server derives winner from DEC-001 house rule (`firstBlood` OR `firstTower` OR `totalCs >= 100`).
- [x] Winner is stored on the ledger at persist (`Match.winningTeamId`).
- [x] Neither qualifies, ambiguous dual qualify, and conflicting exclusive flags fail processing with no partial ledger rows.
- [x] Automated unit + integration tests cover the P0 matrix.
- [x] Verification documented and traceable to this issue.

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `server/prisma/schema.prisma` | Add `Match.winningTeamId` | None |
| `server/prisma/migrations/20260715110545_add_match_winning_team_id/` | NOT NULL column; clears legacy dev rows without stored winner | Low — dev/test ledger only |
| `server/src/services/matchSnapshot.service.ts` | `playerQualifies`, `deriveWinningTeamId`, wire into persist | None |
| `server/src/services/matchSnapshot.service.test.ts` | Unit: rule matrix + persist fail/store paths | None |
| `server/tests/integration/matchSnapshot.integration.test.ts` | Live DB: stored winner + zero rows on fail | None |
| `docs/04-execution/verification/REQ-SRV-07-acceptance-boundary.md` | Assertion map vs DEC-001 / sibling REQs | None |
| `docs/04-execution/verification/REQ-SRV-07-verification.md` | This report | None |
| `docs/00-product/UserStories.md` | Mark `REQ-SRV-07(Done)` | None |

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| One player first blood | Unit + Integration | `winningTeamId` = that player’s team | Yes |
| One player first tower | Unit | `winningTeamId` stored | Yes |
| One player CS ≥ 100 | Unit + Integration | `winningTeamId` stored | Yes |
| Neither qualifies | Unit + Integration | Throw; zero match rows | Yes |
| Both qualify (dual CS) | Unit + Integration | Throw; zero match rows | Yes |
| Both `firstBlood` | Unit | Throw conflicting flags | Yes |
| Both `firstTower` | Unit | Throw conflicting flags | Yes |
| Happy path regression (fields/teams/dedupe) | Unit / Integration | Unchanged otherwise | Yes |

## Test Plan

### Unit Tests (mocked DB)

- `server/src/services/matchSnapshot.service.test.ts` — `deriveWinningTeamId`, `playerQualifies`, persist stores `winningTeamId`, fail paths skip DB.

### Integration Tests (live PostgreSQL)

- `server/tests/integration/matchSnapshot.integration.test.ts` via `npm run test:integration`.

### Manual Smoke

- Not required for this issue. DEC-001 logic is fully covered by unit + integration suites; bot consumption deferred to `REQ-BOT-*`.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `server/src/services/matchSnapshot.service.test.ts` | DEC-001 rule matrix; persist store/fail before DB |
| `server/tests/integration/matchSnapshot.integration.test.ts` | Live DB `winningTeamId`; neither/ambiguous zero rows |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Server unit tests | `cd server && npm test` | Pass — 48 passed (5 files) |
| Server integration | `cd server && npm run test:integration` | Pass — 10 passed, 2 skipped (live DB) |
| Acceptance boundary | [REQ-SRV-07-acceptance-boundary.md](./REQ-SRV-07-acceptance-boundary.md) | A/B/C checklist complete |
| Lint / typecheck | — | Not Available (no project scripts) |

## Manual Smoke Test

Steps:

1. Not performed — automated unit + integration coverage sufficient for server-only persist logic.

Result: **Not Performed**

Notes: Telegram `/stats` and worker error surfacing are separate requirements.

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Business logic in `matchSnapshot.service`; store-at-persist per DEC-001 |
| Security | Pass | No secrets; fail-closed on ambiguous outcomes |
| Error Handling | Pass | Clear messages; pre-transaction fail for bad outcomes |
| Maintainability | Pass | Pure helpers exported for tests; evidence fields unchanged |
| Performance | Pass | O(1) over two players |
| Scope Control | Pass | No bot UI; no query-time-only derivation |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test matrix covered
- [x] Tests added or updated
- [x] Server unit tests pass
- [x] Server integration tests pass
- [x] Documentation updated (acceptance boundary, verification, UserStories)
- [ ] PR summary published with `Closes #24` (next TODO)

## Documentation Notes

### Deferred follow-ups

| Item | Requirement | Notes |
|------|-------------|-------|
| Telegram stats | REQ-BOT-01–03 | Read stored `winningTeamId`; optional win-reason display from evidence |
| Failed raw-event recording | REQ-SRV-08 | Worker already surfaces thrown errors; polish deferred |

### ADR

- Not Required — product decision captured in [DEC-001](../../05-knowledge/Decisions.md#dec-001--custom-duel-win-judgement)

## PR Summary

### What changed

- Added `Match.winningTeamId` schema + migration.
- Implemented DEC-001 `deriveWinningTeamId` and store-at-persist in `persistMatchSnapshot`.
- Added unit + integration tests for winner, neither, ambiguous, and conflicting flags.
- Documented acceptance boundary and verification for REQ-SRV-07.

### Why

- Closes REQ-SRV-07 / #24: canonical duel outcome on the ledger for downstream Telegram W/L.

### Tests

- `cd server && npm test` — 48 passed
- `cd server && npm run test:integration` — 10 passed, 2 skipped

### Risks

- Migration deletes pre-REQ-SRV-07 dev rows without stored winners before adding NOT NULL column.
- Integration tests require `server/.env` (`DATABASE_URL`); skipped when unset.

### Notes for reviewer

- Win rule is flat OR per DEC-001 — not LCU nexus win.
- Bot stats (`REQ-BOT-*`) consume `winningTeamId` in a follow-up; this PR only persists it.

## Completion Decision

Status: **Ready for PR**

Reason: Issue #24 acceptance criteria covered by schema, DEC-001 derivation, store-at-persist, P0 test matrix, and verification docs.

Remaining work:

- Publish PR with `Closes #24`.
