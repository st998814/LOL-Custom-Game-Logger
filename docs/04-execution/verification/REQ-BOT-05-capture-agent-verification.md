# REQ-BOT-05 (capture agent) — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#41](https://github.com/st998814/LOL-Custom-Game-Logger/issues/41); branch `feat/#41-user-link`.

Scope: capture agent side of linking a host's PUUID to a Telegram identity. Server work is out of scope and tracked in [API.md § User account](../../01-architecture/API.md#user-account-req-bot-05).

## Acceptance Criteria Review

- [x] After every successful bootstrap (startup and reconnect) the agent runs a dedicated `IDENTIFYING` stage that classifies the host's PUUID (`test_identify_checks_bootstrapped_summoner_then_ready`, `test_run_once_reconnects_when_lcu_lost`).
- [x] A PUUID unknown to the server (`NEW`) gets a welcome log and no QR code (`test_identify_welcomes_new_user_without_link`).
- [x] A PUUID without a Telegram id (`UNLINKED`) is offered a link QR code (`test_identify_offers_link_to_unlinked_user`).
- [x] A linked PUUID gets nothing (`test_identify_does_nothing_for_linked_user`).
- [x] When a `NEW` host's first game reaches the server (SENT delivery or non-empty flush), the agent logs "Your first game was received" and offers a link once (`test_first_sent_game_offers_link_once`, `test_flushed_games_count_as_first_game`).
- [x] A snapshot stored locally (server down) does not count as received (`test_stored_game_is_not_received`).
- [x] Account failures never stop capture; `UNKNOWN` is re-checked on the next received game (`test_identify_is_unknown_when_server_unavailable`, `test_unknown_status_is_rechecked_when_a_game_is_received`).
- [x] Opponent accounts are not handled (only `LcuSession.summoner` is identified).

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `capture_agent/account/__init__.py` | New package | None |
| `capture_agent/account/errors.py` | `AccountError`, `AccountUnavailableError`, `AlreadyLinkedError` | None |
| `capture_agent/account/api.py` | `AccountApi` protocol, `HttpAccountApi`, `AccountRecord`, `LinkTicket` | Status endpoint not on server yet |
| `capture_agent/services/account.py` | `AccountStatus`, `AccountService` (identify, delivery/flush hooks, link offer) | None |
| `capture_agent/app.py` | `IDENTIFYING` state, `identify()`, account hooks in `run()`/`_run_once()`, re-identify on reconnect | None |
| `capture_agent/main.py` | Wires `AccountService(HttpAccountApi(http), generate_qr_code)`; calls `identify()` before `run()` | None |
| `capture_agent/tests/test_account_api.py` | New — adapter mapping and error matrix | None |
| `capture_agent/tests/test_account_service.py` | New — service state transitions | None |
| `capture_agent/tests/test_app_run.py` | `FakeAccount`; identify stage and hook tests | None |
| `docs/01-architecture/API.md` | User account section with planned contract | None |

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| Status payload → `AccountRecord` (3 cases) | Unit | Correct record; `GET user/status?puuid=` | Yes |
| Malformed status payload | Unit | `AccountUnavailableError` | Yes |
| Transport error / 404 on status | Unit | `AccountUnavailableError` | Yes |
| Link 200 with/without valid `expiresIn` | Unit | `LinkTicket`; invalid expiry → `None` | Yes |
| Link 409 | Unit | `AlreadyLinkedError` | Yes |
| Link 400/500/connection error, bad payload | Unit | `AccountUnavailableError` | Yes |
| identify: NEW / UNLINKED / LINKED / UNKNOWN | Unit | Welcome / QR / nothing / warning | Yes |
| Link offer 409 / unavailable | Unit | `LINKED` / stays `UNLINKED`, warning | Yes |
| First SENT game for NEW, then second game | Unit | One QR; status `UNLINKED` | Yes |
| STORED delivery, empty flush | Unit | Nothing | Yes |
| Non-empty flush for NEW | Unit | QR offered | Yes |
| UNKNOWN re-check success / failure | Unit | QR offered / stays `UNKNOWN` | Yes |
| `CaptureAgent.identify()` states, guard, failure, cancel | Unit | `IDENTIFYING`→`READY`; `InvalidStateError`; `FAILED`; `FINISHED` | Yes |
| Delivery result and flush count forwarded | Unit | `on_delivered(result)`, `on_flushed(n)` | Yes |
| Reconnect re-identifies new summoner | Unit | `identify(summoner-2)` | Yes |
| Skip / local store failure | Unit | No `on_delivered` | Yes |
| Live server status + Telegram link | Manual smoke | End-to-end linking | N/A — blocked on server work |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Import smoke | `cd capture_agent && uv run python -c "import main"` | Pass |
| Unit tests | `cd capture_agent && uv run pytest --ignore=tests/test_api.py --ignore=tests/test_collector.py --ignore=tests/test_parser.py` | 77 passed, 5 failed (pre-existing, see below) |
| Typecheck | N/A | Not Available — no mypy/pyright configured |

Pre-existing failures, unrelated to this change:

- `tests/test_api.py`, `tests/test_collector.py`, `tests/test_parser.py` fail to import (`data.parser` no longer exists).
- All 5 tests in `tests/test_main.py` reference removed code (`main.error`, `main.Client`, `api`).

## Manual Smoke Test

Blocked until the server ships `GET /api/user/status`. Until then the agent logs "Could not check account status" at startup and continues capturing (status `UNKNOWN`).

Steps once the server is ready:

1. Start the server; start the agent with League open on an account the server has never seen. Expect the welcome log.
2. Finish a custom 1v1. Expect "Your first game was received" and a terminal QR code.
3. Scan the QR code with Telegram and complete `/start`. Restart the agent; expect no QR code (`LINKED`).
4. With a registered but unlinked account, start the agent; expect a QR code right after bootstrap.

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Adapter in its own `account/` package; service depends only on the `AccountApi` protocol; `transport/` untouched |
| Security | Pass | PUUID is the only identifier sent; no secrets stored |
| Error Handling | Pass | Account checks are a soft dependency; no server failure stops capture |
| Maintainability | Pass | Mirrors `DeliveryService` and `HttpSnapshotSink` patterns |
| Scope Control | Pass | No token/credential infrastructure; server changes deferred |

## Completion Decision

Status: Done (capture agent side)

Remaining work:

- Server: status endpoint, link reuse with `expiresIn`, upsert on link completion, Redis key fix.
- Manual smoke test once the server work lands.
