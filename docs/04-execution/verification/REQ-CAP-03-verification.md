# REQ-CAP-03 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#8](https://github.com/st998814/LOL-Custom-Game-Logger/issues/8); branch `req-cap-03-match-snapshot-collection`.

## Acceptance Criteria Review

- [x] Client polls gameflow until a match is `InProgress`, then captures `gameId` from the LCU session.
- [x] Client detects game end (gameflow reaches `WaitingForStats`) before fetching match data.
- [x] Client retrieves match snapshot from LCU match-history API without manual input.
- [x] Failed match fetch after bounded retries surfaces a clear operator-facing error and does not send a partial payload.
- [x] Automated tests cover happy path and failure path (empty match response after retries).

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `client/tests/fixtures/lcu_match_raw.json` | Swagger-realistic 2-player custom-game match-history fixture | None |
| `client/lcu/agent.py` | Fixed 5×3s match-history retries; raise `LCUWorkflowError` on exhaustion | None |
| `client/lcu/error.py` | Added default message for `LCUWorkflowError` | None |
| `client/main.py` | Recover to `READY` on workflow failure; keep polling for next game | None |
| `client/tests/test_collector.py` | FakeConnection tests for phase transitions and fetch paths | None |
| `client/tests/test_parser.py` | Raw fixture → `Packer` round-trip | None |
| `client/tests/test_main.py` | `run()` returns to `READY` on `LCUWorkflowError` | None |
| `client/README.md` | Match capture logs, retry behavior, troubleshooting for fetch failure | None |

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| Gameflow `InProgress` → session `gameId` | Unit | `fecth_game_id()` returns int | Yes |
| Session missing `gameData.gameId` | Unit | `InvalidSummonerPayloadError` | Yes |
| `WaitingForStats` → MATCH returns payload | Unit | `get_raw_data()` returns dict | Yes |
| MATCH empty through retries | Unit | `LCUWorkflowError`; no silent `None` | Yes |
| `LCUWorkflowError` in `run()` | Unit | State returns to `READY` | Yes |
| Swagger fixture → `Packer.pack()` | Unit | Valid `match` + `players` | Yes |
| Lobby → in-game → post-game collect flow | Unit | End-to-end collector script passes | Yes |
| Real custom 1v1 capture | Manual smoke | Logs fetch success; payload packable | N/A — deferred to M4 dogfood |
| Client import regression | Smoke | `import main` succeeds | Yes |
| REQ-CAP-02 regression | Unit | Credential resolver tests still pass | Yes |

## Test Plan

### Unit Tests

- Collector phase and fetch tests in `client/tests/test_collector.py`.
- Parser round-trip in `client/tests/test_parser.py`.
- Recoverable workflow failure in `client/tests/test_main.py`.

### Integration Tests

- Not required; no server ingest or database boundary changed in this issue.

### E2E Tests

- Not required; send path remains `REQ-CAP-05`.

### Manual Smoke Tests

- Real League custom 1v1 capture deferred to **M4 — Dogfood** per plan alignment. Automated tests use swagger-realistic fixture and mocked LCU responses.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `client/tests/test_collector.py` | Gameflow polling, session `gameId`, match fetch success/failure, full collect flow |
| `client/tests/test_parser.py` | LCU match-history fixture packs to ingest shape |
| `client/tests/test_main.py` | `run()` recovers to `READY` on `LCUWorkflowError` |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Lint | IDE diagnostics for changed files | Pass |
| Typecheck | N/A | Not Available — no mypy/pyright configured in `client/` |
| Unit tests | `cd client && uv run pytest` | Pass — 15 passed |
| Import smoke | `cd client && uv run python -c "import main; print('main import ok')"` | Pass |
| Build/deps | `cd client && uv sync` | Pass |
| Manual smoke | Real custom 1v1 with League open | N/A — deferred to M4 dogfood |

## Manual Smoke Test

Steps (for M4 dogfood):

1. Open League and start the capture client (`cd client && uv run python main.py`).
2. Host a custom 1v1; finish the game.
3. Confirm logs include `Match data fetched successfully` and `Match payload sent successfully`.

Result: **N/A for REQ-CAP-03**

Notes: Issue scope uses automated proof only. Live LCU validation is scheduled for milestone M4.

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Changes stay in LCU edge client; match-history only; no EOG or server changes |
| Security | Pass | No new credential or token logging paths |
| Error Handling | Pass | Exhausted retries raise `LCUWorkflowError`; client recovers to `READY` |
| Maintainability | Pass | FakeConnection pattern mirrors REQ-CAP-02 tests; fixture aligned to hasagi-types schema |
| Performance | Pass | Production poll/sleep unchanged; tests patch `asyncio.sleep` |
| Scope Control | Pass | No 2-player validation, transport hardening, or renames |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test Matrix covered (manual smoke explicitly deferred)
- [x] Tests added or updated
- [x] Lint passes
- [x] Typecheck passes — N/A, no typechecker configured
- [x] Tests pass
- [x] Build/dependency check passes
- [x] Manual smoke test completed if needed — N/A; deferred to M4 per plan
- [x] No unrelated changes
- [x] Documentation updated
- [ ] PR summary prepared — pending publish step

## Documentation Notes

### Changelog Entry

- Hardened LCU match snapshot collection after `WaitingForStats`, with recoverable fetch failures and pytest coverage for `REQ-CAP-03`.

### API Docs Update

- Not Required

### ADR

- Not Required

### Developer Notes

- LCU fixture shape follows `LolMatchHistoryMatchHistoryGame` from [dysolix/hasagi-types](https://github.com/dysolix/hasagi-types) / [LCU Swagger UI](https://swagger.dysolix.dev/lcu/).
- Snapshot source is `GET /lol-match-history/v1/games/{gameId}` only; `EOG` endpoint remains unused.

## PR Summary

### What changed

- Hardened match-history fetch with 5×3s retries and explicit `LCUWorkflowError`.
- Client recovers to `READY` after snapshot fetch failure so the host can capture the next game without restart.
- Added swagger-realistic LCU fixture and collector/parser/main unit tests.
- Updated client runbook for match capture logs and troubleshooting.

### Why

- Closes `REQ-CAP-03`: client detects game end and collects a match snapshot from LCU without manual entry.

### Tests

- `cd client && uv run pytest` — 15 passed
- `cd client && uv run python -c "import main; print('main import ok')"` — pass

### Risks

- Fixture may differ slightly from live LCU JSON; M4 dogfood validates against real customs.

### Notes for reviewer

- Game-end gate remains `WaitingForStats` only (unchanged from prototype).
- Recoverable workflow errors intentionally do not set `AppState.FAILED`.

## Completion Decision

Status: Done

Reason: Acceptance criteria are covered by focused pytest tests, import smoke, and updated operator documentation. Manual League smoke deferred to M4 per agreed plan scope.

Remaining work:

- Publish PR with `Closes #8` via **publish-pull-request** skill.
