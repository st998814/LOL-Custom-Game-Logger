# REQ-SRV-02 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#17](https://github.com/st998814/LOL-Custom-Game-Logger/issues/17); branch `req-srv-02-worker-persistence`.

Related: [acceptance boundary](./REQ-SRV-02-acceptance-boundary.md) · [manual smoke](./REQ-SRV-02-manual-smoke.md)

## Acceptance Criteria Review

- [x] Worker processes queued `MATCH_SNAPSHOT` raw events.
- [x] Persistence writes `Match`, `Player`, and `MatchPlayer` rows to PostgreSQL.
- [x] Core match fields persisted: `gameId`, `gameDuration`, `gameCreationDate`.
- [x] Core player fields persisted: `puuid`, `gameName`, `tagLine`, `championId`, `firstBlood`, `firstTower`, `totalCs`, `teamId`.
- [x] `RawEvent` transitions to `PROCESSED` on success.
- [x] Fewer than 2 valid players fails the event (retry → `FAILED`).
- [x] Duplicate `game_id` (existing `matches` row) fails the event.
- [x] Verification documented and traceable to this issue.

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `server/src/services/matchSnapshot.service.ts` | Extracted persistence; hardened validation | None |
| `server/src/workers/rawEventProcessor.ts` | Thin orchestration; calls service | None |
| `server/src/services/matchSnapshot.service.test.ts` | Mocked unit tests (S1–S5, F1–F3) | None |
| `server/src/workers/rawEventProcessor.test.ts` | Worker status transition tests (W1–W3) | None |
| `server/tests/integration/matchSnapshot.integration.test.ts` | Live PostgreSQL service-direct tests | Requires `server/.env` |
| `server/tests/manual/worker-smoke-once.ts` | Reproducible worker smoke helper | None |
| `docs/04-execution/verification/REQ-SRV-02-acceptance-boundary.md` | Assertion map | None |
| `docs/04-execution/verification/REQ-SRV-02-manual-smoke.md` | Manual smoke evidence | None |
| `server/README.md` | Integration test note updated | None |

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| Valid `MATCH_SNAPSHOT` persistence | Unit + Integration + Manual | Ledger rows + `PROCESSED` | Yes |
| Core field values on match/players | Unit + Integration + Manual | Fields match fixture | Yes |
| Malformed player entries | Unit + Integration | Throw; no partial rows | Yes |
| Duplicate `game_id` | Unit + Integration | Throw; one match row | Yes |
| Worker retry on failure | Unit | `PENDING` while retries remain | Yes |
| Worker `FAILED` after max retries | Unit | `FAILED` + `errorMessage` | Yes |
| Unsupported `eventType` | Unit | Throw | Yes |
| REQ-SRV-01 ingest regression | Regression | Unchanged | Yes |
| Client pytest regression | Regression | 27 passed | Yes |
| Winner derivation | — | Deferred `REQ-SRV-07` | N/A |
| Null-`puuid` identity | — | Deferred | N/A |
| Full HTTP queue → worker E2E | — | REQ-SRV-01 + this smoke sufficient for M1 | N/A |

## Test Plan

### Unit Tests (mocked DB)

- `server/src/services/matchSnapshot.service.test.ts` — persistence, field mapping, failure paths.
- `server/src/workers/rawEventProcessor.test.ts` — `PROCESSED` / retry / `FAILED` transitions.

### Integration Tests (live PostgreSQL)

- `server/tests/integration/matchSnapshot.integration.test.ts` via `npm run test:integration`.

### Manual Smoke

- [REQ-SRV-02-manual-smoke.md](./REQ-SRV-02-manual-smoke.md) — seed `PENDING` → `processBatch` → inspect DB.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `server/src/services/matchSnapshot.service.test.ts` | Happy path, duplicate match, malformed players, missing match/players |
| `server/src/workers/rawEventProcessor.test.ts` | W1–W3 worker status transitions |
| `server/tests/integration/matchSnapshot.integration.test.ts` | Live DB persistence, duplicate, no partial writes |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Server unit tests | `cd server && npm test` | Pass — 30 passed |
| Server integration | `cd server && npm run test:integration` | Pass — 5 passed (live Supabase) |
| Client regression | `cd client && uv run pytest` | Pass — 27 passed |
| Manual smoke | `npx tsx tests/manual/worker-smoke-once.ts` → [smoke record](./REQ-SRV-02-manual-smoke.md) | Pass |
| Acceptance boundary | [REQ-SRV-02-acceptance-boundary.md](./REQ-SRV-02-acceptance-boundary.md) | S/W/F checklist complete |

## Manual Smoke Test

See [REQ-SRV-02-manual-smoke.md](./REQ-SRV-02-manual-smoke.md).

Result: **Pass** — `PENDING` raw event → `PROCESSED`; one match + two match-player rows with correct core fields.

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Persistence in `matchSnapshot.service`; worker orchestrates only |
| Security | Pass | No secrets in docs; DB access remains server-only |
| Error Handling | Pass | Malformed/duplicate failures surface on raw event; bounded retries |
| Maintainability | Pass | Mocked unit + live integration + reproducible smoke script |
| Performance | Pass | Single transaction per snapshot; batch poll unchanged |
| Scope Control | Pass | Winner, null-puuid, full M2 dedupe deferred |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test matrix covered (deferred items documented)
- [x] Tests added or updated
- [x] Server unit tests pass
- [x] Server integration tests pass
- [x] Client regression passes
- [x] Manual smoke completed
- [x] Documentation updated (acceptance boundary, verification, README)
- [x] PR summary prepared (below)

## Documentation Notes

### Deferred follow-ups

| Item | Requirement | Notes |
|------|-------------|-------|
| Winner derivation | REQ-SRV-07 | No `winner` column in schema yet |
| Ledger-level dedupe story | REQ-SRV-06 | Ingest `409` + service rejects existing match |
| Null-`puuid` player identity | — | Fixtures use real puuids; behavior unchanged |
| Duplicate-match immediate fail | REQ-SRV-06 | Currently retries to `FAILED`; acceptable per grill-me |

### ADR

- Not Required

## PR Summary

### What changed

- Extracted `matchSnapshot.service` from worker with hardened persistence rules.
- Added unit tests (mocked), live integration tests (service-direct), and worker manual smoke.
- Documented acceptance boundary and verification artifacts for REQ-SRV-02.

### Why

- Closes REQ-SRV-02 / #17: worker processes `MATCH_SNAPSHOT` events and persists to PostgreSQL with traceable proof.

### Tests

- `cd server && npm test` — 30 passed
- `cd server && npm run test:integration` — 5 passed
- `cd client && uv run pytest` — 27 passed
- `cd server && npx tsx tests/manual/worker-smoke-once.ts` — Pass

### Risks

- Integration tests and manual smoke require `server/.env` (skipped in CI until workflow added).
- Duplicate-match failures retry 5 times before `FAILED` (permanent condition).

### Notes for reviewer

- Ingest queueing remains REQ-SRV-01; this PR completes the worker → ledger step for M1.
- Winner and stats read path are subsequent milestones (M2/M3).

## Completion Decision

Status: **Ready for PR**

Reason: Issue #17 acceptance criteria covered by automated tests, live integration, manual smoke, and verification docs.

Remaining work:

- Publish PR with `Closes #17`.
