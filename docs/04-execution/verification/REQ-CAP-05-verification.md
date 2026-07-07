# REQ-CAP-05 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#12](https://github.com/st998814/LOL-Custom-Game-Logger/issues/12); branch `req-cap-05-send-match-snapshot`.

## Acceptance Criteria Review

- [x] After a valid 2-player snapshot, client POSTs to `/api/events` with `eventType: MATCH_SNAPSHOT` (`test_run_sends_match_snapshot_and_returns_ready_on_success`).
- [x] Payload includes `match.game_id`, `match.game_duration`, `match.game_creation_date` (asserted in happy-path `run()` test).
- [x] Payload includes `players[]` with per-player fields (`participant_id`, `team_id`, `puuid`, `game_name`, `tag_line`, `champion_id`, `first_blood`, `first_tower`, `total_cs`).
- [x] Transport failures raise `BackendRequestError`; HTTP ≥400 raises `BackendResponseError`; non-JSON raises `BackendResponseParseError` (`test_api.py`).
- [x] Backend send failure in `run()` logs error and sets `FAILED` (`test_run_sets_failed_when_backend_send_returns_http_error`).
- [x] Successful send logs confirmation and returns client to `READY` (happy-path `run()` test).

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `client/tests/test_api.py` | New — `ClientRequests.post()` success and error matrix | None |
| `client/tests/test_main.py` | `run()` happy-path send + HTTP 500 → `FAILED` | None |
| `client/tests/conftest.py` | Added `load_seed_payload()` helper | None |
| `client/README.md` | Send failure state note in troubleshooting | None |
| `client/api.py` | Unchanged — send behavior pre-existed | None |
| `client/main.py` | Unchanged — orchestration pre-existed | None |

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| Valid payload POST (202 + JSON) | Unit | `ServerResponse` returned | Yes |
| Connection refused / timeout | Unit | `BackendRequestError` | Yes |
| HTTP 400/500 | Unit | `BackendResponseError` | Yes |
| Non-JSON response | Unit | `BackendResponseParseError` | Yes |
| `run()` valid 2-player snapshot | Unit | POST with `MATCH_SNAPSHOT`; `READY` | Yes |
| `run()` backend HTTP error | Unit | `FAILED`; error logged | Yes |
| Existing client tests | Regression | All pass | Yes |
| POST seed to live server | Integration / Manual | `RawEvent` PENDING | N/A — deferred to M4 |
| Real custom 1v1 + server stack | Manual smoke | End-to-end ingest | N/A — deferred to M4 dogfood |

## Test Plan

### Unit Tests

- `ClientRequests` matrix in `client/tests/test_api.py`.
- `run()` send orchestration in `client/tests/test_main.py`.

### Integration Tests

- Not required for this issue; server ingest unchanged.

### E2E Tests

- Deferred to M4 vertical slice with live League + server.

### Manual Smoke Tests

- Host custom 1v1 with server running deferred to **M4 — Dogfood**.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `client/tests/test_api.py` | POST success, transport error, HTTP 400/500, invalid JSON |
| `client/tests/test_main.py` | Happy-path send; backend failure → `FAILED` |
| `client/tests/conftest.py` | `load_seed_payload()` for ingest-shaped fixture |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Lint | IDE diagnostics for changed files | Pass |
| Typecheck | N/A | Not Available — no mypy/pyright configured in `client/` |
| Unit tests | `cd client && uv run pytest` | Pass — 27 passed |
| Import smoke | `cd client && uv run python -c "import main; print('main import ok')"` | Pass |
| Build/deps | `cd client && uv sync` | Pass |
| Manual smoke | Real 1v1 + server ingest | N/A — deferred to M4 dogfood |

## Manual Smoke Test

Steps (for M4 dogfood):

1. Start server stack (`POST /api/events` reachable at `http://127.0.0.1:7871/api/events`).
2. Start capture client with League open; complete a custom 1v1.
3. Confirm `Match payload sent successfully` in client logs and a `PENDING` `RawEvent` in PostgreSQL.

Result: **N/A for REQ-CAP-05**

Notes: Automated tests mock `requests.post`. Live ingest proof scheduled for milestone M4.

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Edge agent POSTs raw event only; no DB access from client |
| Security | Pass | No secrets in payload tests; ingest URL unchanged |
| Error Handling | Pass | Distinct backend error types; send failure is fatal (`FAILED`) |
| Maintainability | Pass | API tests isolated; `run()` tests exercise full pack→send path |
| Performance | Pass | Single POST per capture; 10s timeout unchanged |
| Scope Control | Pass | Tests only; no URL configurability or retry polish |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test Matrix covered (integration/manual deferred)
- [x] Tests added or updated
- [x] Lint passes
- [x] Typecheck passes — N/A
- [x] Tests pass
- [x] Build/dependency check passes
- [x] Manual smoke test completed if needed — N/A; deferred to M4
- [x] No unrelated changes
- [x] Documentation updated
- [x] PR summary prepared

## Documentation Notes

### Changelog Entry

- Added pytest coverage proving LCU client sends `MATCH_SNAPSHOT` raw events to `/api/events` with required match and player fields for REQ-CAP-05.

### API Docs Update

- Not Required

### ADR

- Not Required

### Developer Notes

- `ClientRequests` POST target: `http://127.0.0.1:7871/api/events` (hardcoded in `client/api.py`).
- Server returns `202` with `{ id, status, duplicate }` on successful ingest queue.

## PR Summary

### What changed

- Added `test_api.py` for `ClientRequests` success and error paths.
- Extended `test_main.py` with happy-path send and backend failure tests.
- Added verification report and runbook note for fatal send failures.

### Why

- Closes `REQ-CAP-05`: prove client sends match snapshot to server as a raw event.

### Tests

- `cd client && uv run pytest` — 27 passed
- `cd client && uv run python -c "import main; print('main import ok')"` — pass

### Risks

- Live server ingest not exercised in CI; M4 dogfood validates end-to-end.

### Notes for reviewer

- Production send code unchanged; this PR is verification-focused (Complete issue type).
- Send failures set `FAILED` (unlike recoverable LCU workflow / non-duel skips).

## Completion Decision

Status: Done

Reason: Issue acceptance criteria covered by unit tests; import smoke and deps check pass. Integration/manual deferred to M4 per plan.

Remaining work:

- Publish PR with `Closes #12`.
