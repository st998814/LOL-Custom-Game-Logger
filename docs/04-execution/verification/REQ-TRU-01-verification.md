# REQ-TRU-01 — Verification report

Verification for issue [#33](https://github.com/st998814/LOL-Custom-Game-Logger/issues/33).

## Acceptance Criteria Review

- [x] No user-facing form or admin UI accepts hand-entered duel results into the ledger
- [x] Production HTTP surface does not expose a direct “create match” write path (only raw-event ingest from capture, plus admin raw-event inspect/replay)
- [x] Documented client→server path states that results originate from LCU capture (baseline trust without signing)
- [x] Unused direct match-create route is removed (cannot be re-enabled by uncommenting a mount)

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `server/src/app.ts` | Dropped unused `matchRoutes` import/mount | None |
| `server/src/routes/match.route.ts` (deleted) | Legacy `POST /api/data` | None |
| `server/src/controllers/match.controller.ts` (deleted) | Direct create-match controller | None |
| `server/src/services/match.service.ts` (deleted) | Unused create-match service | None |
| `server/src/models/match.model.ts` (deleted) | Unused create-match model | None |
| `server/src/types/type.match.ts` (deleted) | Types only used by deleted stack | None |
| `server/src/routes/writeSurface.route.test.ts` | Regression: `POST /api/data` → 404 | None |
| `docs/01-architecture/API.md` | Trust constraint (REQ-TRU-01) | None |
| `docs/01-architecture/SystemArchitecture.md` | Rule 7 + ingest trust note | None |
| `server/docs/ARCHITECTURE.md` | Example flow → ingest layers | None |
| `docs/00-product/UserStories.md` | `REQ-TRU-01(Done)` | None |

Worker persist path (`matchSnapshot.service`) unchanged — still the only way matches land in PostgreSQL after ingest.

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| `POST /api/data` absent | Unit/HTTP | 404 | Yes |
| `POST /api/events` still works | Regression | 202 on valid fixture | Yes (existing) |
| Mounted routes = events + admin + stats | Code review | No create-match route | Yes |
| No hand-entry UI in bot/client | Manual / code review | Read-only bot; LCU send only | Yes |
| Live custom 1v1 E2E | Manual | Deferred to M4 dogfood | N/A |

## Test Plan

### Unit / HTTP

- `server/src/routes/writeSurface.route.test.ts` — legacy create path returns 404
- `server/src/routes/rawEvent.route.test.ts` — ingest path still accepted

### Manual / review

- Confirm `app.ts` mounts only `rawEventRoutes`, `rawEventAdminRoutes`, `statsRoutes`
- Confirm Telegram bot has no match-create commands; client only POSTs `/api/events`

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `server/src/routes/writeSurface.route.test.ts` | `POST /api/data` → 404 |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Write-surface + ingest HTTP | `cd server && npx vitest run src/routes/writeSurface.route.test.ts src/routes/rawEvent.route.test.ts` | Pass — 5 tests |
| Docs trust wording | Review API + SystemArchitecture | Pass |
| Dead stack removed | Grep `match.route` / `createMatchController` under `server/src` | Pass — no matches |

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Aligns with LCU → ingest → worker only |
| Security | Pass | Removes accidental re-enable of direct write; no ingest auth (explicit non-goal) |
| Maintainability | Pass | Stale create-match ARCHITECTURE example replaced |
| Scope Control | Pass | No signing (`REQ-TRU-02+`); no E2E dogfood |

## PR Summary (draft)

- Removed unused direct match-create HTTP stack (`POST /api/data`).
- Added regression test that the legacy path returns 404.
- Documented REQ-TRU-01 trust constraint: ledger writes are LCU-sourced via raw events only.

Closes #33
