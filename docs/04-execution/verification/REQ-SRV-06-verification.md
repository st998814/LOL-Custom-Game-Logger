# REQ-SRV-06 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#23](https://github.com/st998814/LOL-Custom-Game-Logger/issues/23); branch `req-srv-06-verify-ingest-dedupe`.

Related: [acceptance boundary](./REQ-SRV-06-acceptance-boundary.md) · prior ingest smoke [REQ-SRV-01-manual-smoke.md](./REQ-SRV-01-manual-smoke.md)

## Acceptance Criteria Review

- [x] Duplicate ingest of the same `gameId` / dedup key is rejected at HTTP ingest (`409 DUPLICATE_SNAPSHOT`).
- [x] Same game does not produce two `matches` rows (ingest gate + Match PK backstop).
- [x] Dedup key derivation from `match.game_id` is tested; explicit `deduplicationKey` override still works.
- [x] Verification docs trace REQ-SRV-06 separately from REQ-SRV-03 PK reject.
- [x] Verification documented and traceable to this issue.

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `docs/04-execution/verification/REQ-SRV-06-acceptance-boundary.md` | Three-layer dedupe map vs sibling REQs | None |
| `docs/04-execution/verification/REQ-SRV-06-verification.md` | This report | None |
| `docs/00-product/UserStories.md` | Mark `REQ-SRV-06(Done)` (follow-up TODO) | None |

No schema or service changes — behavior already landed under REQ-SRV-01 / REQ-SRV-02 / REQ-SRV-03.

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| First ingest | Unit + Integration | `202` + one `PENDING` raw event | Yes |
| Same dedup key again | Unit + HTTP + Integration | `409 DUPLICATE_SNAPSHOT`; still one raw_event | Yes |
| Derive key from `game_id` | Unit | `MATCH_SNAPSHOT:{id}` | Yes |
| Explicit `deduplicationKey` | Unit | Key used as supplied | Yes |
| Insert race `P2002` | Unit | Mapped to `DuplicateSnapshotError` | Yes |
| Same `gameId` persist twice | Unit + Integration | Throw; one match row | Yes (REQ-SRV-03 suite) |
| Client `409` → READY | — | Deferred #15 | N/A |

## Test Plan

### Unit / HTTP

- `server/src/services/rawEvent.service.test.ts`
- `server/src/routes/rawEvent.route.test.ts`
- `server/src/controllers/ingestHttp.test.ts`
- `server/src/services/matchSnapshot.service.test.ts` (ledger backstop)

### Integration (live PostgreSQL)

- `server/tests/integration/ingest.integration.test.ts`
- `server/tests/integration/matchSnapshot.integration.test.ts`

### Manual Smoke

- Not re-run. [REQ-SRV-01-manual-smoke.md](./REQ-SRV-01-manual-smoke.md) already recorded `202` then `409 DUPLICATE_SNAPSHOT`.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| — | None this issue (existing coverage sufficient per gap check) |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Server unit tests | `cd server && npm test` | Pass — 35 passed (5 files) |
| Server integration | `cd server && npm run test:integration` | Pass — 7 passed, 2 skipped (live DB) |
| Acceptance boundary | [REQ-SRV-06-acceptance-boundary.md](./REQ-SRV-06-acceptance-boundary.md) | A/B/C checklist complete |
| Gap check | AC → existing tests | No production/test gaps |

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Ingest owns key/409; Match PK is documented backstop |
| Security | Pass | No secrets in docs |
| Error Handling | Pass | Stable `DUPLICATE_SNAPSHOT` code |
| Maintainability | Pass | Docs-only Close; cites existing suites |
| Performance | Pass | Unchanged |
| Scope Control | Pass | Client #15 and winner deferred |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test matrix covered (deferred items documented)
- [x] Existing unit + integration suites pass
- [x] Documentation updated (acceptance boundary, verification)
- [ ] `UserStories.md` marks `REQ-SRV-06(Done)` (next TODO)
- [ ] PR summary published with `Closes #23`

## Documentation Notes

### Deferred follow-ups

| Item | Requirement / issue | Notes |
|------|---------------------|-------|
| Client 409 idempotency | #15 | P1; treat duplicate resend as success |
| Winner column | REQ-SRV-07 | Not in schema yet |

### ADR

- Not Required

## PR Summary

### What changed

- Documented acceptance boundary and verification for REQ-SRV-06 three-layer dedupe.
- Confirmed existing automated coverage; no service rewrite.

### Why

- Closes REQ-SRV-06 / #23: prove same game cannot create two ledger entries via ingest key + Match PK backstop.

### Tests

- `cd server && npm test` — 35 passed
- `cd server && npm run test:integration` — 7 passed, 2 skipped

### Risks

- Integration tests require `server/.env` (skipped in CI until workflow added).
- Full HTTP → worker → double-persist E2E remains composed of separate suites (ingest 409 + match reject), not a single orchestration test.

### Notes for reviewer

- Complete-type issue: implementation already shipped under REQ-SRV-01/02/03.
- REQ-SRV-03 owns Match PK behavior; this PR documents the ingest-key story and the combined guarantee.

## Completion Decision

Status: **Ready for UserStories update + PR**

Reason: Issue #23 acceptance criteria covered by existing ingest/match tests and new verification docs.

Remaining work:

- Mark `REQ-SRV-06(Done)` in UserStories.
- Publish PR with `Closes #23`.
