# REQ-SRV-01 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#14](https://github.com/st998814/LOL-Custom-Game-Logger/issues/14); branch `req-srv-01-accept-raw-events`.

## Acceptance Criteria Review

- [x] `POST /api/events` with valid `MATCH_SNAPSHOT` returns `202` and `{ id, status: "PENDING" }` (no `duplicate` field).
- [x] Payload persisted in `raw_events` with `status = PENDING` before worker runs.
- [x] Duplicate ingest (same deduplication key) returns `409` `DUPLICATE_SNAPSHOT` and does not create a second row.
- [x] Invalid body returns `400` with `{ error, code }`.
- [x] Front guard: `findByDeduplicationKey` runs before insert; `P2002` race maps to `409`.
- [x] First client POST per game still works (`202`); client `pytest` regression passes.
- [x] Verification documented and traceable to this issue.

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `server/src/errors/ingest.errors.ts` | `IngestValidationError`, `DuplicateSnapshotError` | None |
| `server/src/services/rawEvent.service.ts` | Snapshot validation, duplicate front guard | None |
| `server/src/controllers/data.controller.ts` | `202` / `400` / `409` mapping | None |
| `server/src/controllers/ingestHttp.ts` | Response builders | None |
| `server/src/**/*.test.ts` | Unit + HTTP tests (mocked) | None |
| `server/tests/integration/ingest.integration.test.ts` | Live DB ingest tests | Requires `server/.env` |
| `server/vitest.config.ts`, `vitest.integration.config.ts` | Test harness | None |
| `server/package.json` | `vitest`, `supertest`, test scripts | None |
| `docs/01-architecture/API.md` | Ingest contract | None |
| `docs/01-architecture/SystemArchitecture.md` | §9.1, §9.4 updated | None |
| `server/README.md` | Ingest contract + test commands | None |
| `docs/04-execution/verification/REQ-SRV-01-manual-smoke.md` | Manual smoke evidence | None |

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| Valid snapshot ingest | Unit + HTTP + Integration + Manual | `202`, one `PENDING` row | Yes |
| Duplicate same `game_id` | Unit + HTTP + Integration + Manual | `409 DUPLICATE_SNAPSHOT`, one row | Yes |
| Missing / invalid fields | Unit + HTTP + Integration | `400` + `code` | Yes |
| Guard before insert | Unit | `findByDeduplicationKey` before `createRawEvent` | Yes |
| `P2002` race | Unit | `DuplicateSnapshotError` | Yes |
| Client pytest regression | Regression | 27 passed | Yes |
| Worker `PROCESSED` / `matches` row | Manual | Deferred REQ-SRV-02 | N/A |
| Client `409` idempotent resend | Manual | Follow-up issue | N/A |

## Test Plan

### Unit Tests (mocked DB)

- `server/src/services/rawEvent.service.test.ts` — validation, guard, dedup key, `P2002`.
- `server/src/controllers/ingestHttp.test.ts` — response body mapping.
- `server/src/routes/rawEvent.route.test.ts` — `POST /api/events` status codes.

### Integration Tests (live PostgreSQL)

- `server/tests/integration/ingest.integration.test.ts` via `npm run test:integration`.

### Manual Smoke

- [REQ-SRV-01-manual-smoke.md](./REQ-SRV-01-manual-smoke.md) — curl against `npm run dev`.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `server/src/services/rawEvent.service.test.ts` | Happy path, guard, validation codes, `P2002` |
| `server/src/routes/rawEvent.route.test.ts` | `202` / `409` / `400` HTTP contract |
| `server/src/controllers/ingestHttp.test.ts` | Accepted + error body shapes |
| `server/tests/integration/ingest.integration.test.ts` | Live DB first/duplicate/invalid |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Server unit tests | `cd server && npm test` | Pass — 18 passed |
| Server integration | `cd server && npm run test:integration` | Pass — 2 passed (live Supabase) |
| Client regression | `cd client && uv run pytest` | Pass — 27 passed |
| Manual smoke | curl → [smoke record](./REQ-SRV-01-manual-smoke.md) | Pass |
| Docs | `API.md`, `SystemArchitecture.md` §9.1 | Updated |

## Manual Smoke Test

See [REQ-SRV-01-manual-smoke.md](./REQ-SRV-01-manual-smoke.md).

Result: **Pass** — `202` on first POST; `409 DUPLICATE_SNAPSHOT` on duplicate; `400` on `{}`.

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Ingest in application tier only; async queue semantics preserved |
| Security | Pass | No secrets in docs; validation rejects malformed ingest |
| Error Handling | Pass | Specific `400` codes; duplicate `409`; race fallback |
| Maintainability | Pass | Mocked unit tests + isolated integration config |
| Performance | Pass | Guard is single lookup; `202` before worker |
| Scope Control | Pass | No client changes; REQ-SRV-02 deferred |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test matrix covered (worker E2E deferred)
- [x] Tests added or updated
- [x] Server tests pass
- [x] Client regression passes
- [x] Manual smoke completed
- [x] Documentation updated (`API.md`, architecture, README)
- [x] PR summary prepared (below)

## Documentation Notes

### API Docs Update

- [API.md](../../01-architecture/API.md) — full ingest contract
- [SystemArchitecture.md](../../01-architecture/SystemArchitecture.md) §9.1, §9.4

### Client follow-up (out of scope)

`client/api.py` raises `BackendResponseError` on `409`. A **separate issue** should treat `DUPLICATE_SNAPSHOT` as idempotent success (log + `READY`) so accidental resend does not set `FAILED`.

Suggested title: `REQ-CAP-07: Treat DUPLICATE_SNAPSHOT 409 as idempotent ingest success` (or link to existing backlog).

### ADR

- Not Required

## PR Summary

### What changed

- Hardened ingest validation and duplicate **front guard** (`409` reject, not `202 duplicate:true`).
- Added Vitest suite (mocked + live integration) and manual smoke record.
- Documented ingest contract in `API.md` and architecture §9.

### Why

- Closes REQ-SRV-01 / #14: server accepts raw events over HTTP, queues new snapshots, rejects duplicates at the boundary.

### Tests

- `cd server && npm test` — 18 passed
- `cd server && npm run test:integration` — 2 passed
- `cd client && uv run pytest` — 27 passed

### Risks

- Client resend of same game hits `409` until follow-up issue lands.
- Integration tests require `server/.env` (skipped in CI until workflow added).

### Notes for reviewer

- Ledger-level dedup (`matches.game_id` PK) remains REQ-SRV-06.
- Worker persistence REQ-SRV-02 is next server milestone work.

## Completion Decision

Status: **Ready for PR**

Reason: Issue #14 acceptance criteria covered by automated tests, live integration, and manual smoke. Docs updated.

Remaining work:

- Publish PR with `Closes #14`.
- Open client follow-up issue for `409` idempotency.
