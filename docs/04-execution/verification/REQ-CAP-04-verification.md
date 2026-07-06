# REQ-CAP-04 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#10](https://github.com/st998814/LOL-Custom-Game-Logger/issues/10); branch `req-cap-04-validate-2-player-duel`.

## Acceptance Criteria Review

- [x] When `participants` and `participantIdentities` are both length 2 and aligned, client packs and may send `MATCH_SNAPSHOT` (validation passes; send path unchanged from REQ-CAP-05).
- [x] When participant counts are not a 2-player duel, client does not POST to server (`test_run_returns_ready_when_match_is_not_a_duel`).
- [x] Rejection is logged with a clear reason including participant counts (`InvalidDuelError` message + `Skipping non-duel match snapshot` warning).
- [x] Client remains in `READY` after rejection (not `FAILED`).

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `client/lcu/error.py` | Added `InvalidDuelError` with count-aware default message | None |
| `client/data/parser.py` | Added `validate_duel_snapshot()` cross-checking both arrays | None |
| `client/main.py` | Validate before pack; recover to `READY` on `InvalidDuelError` | None |
| `client/tests/conftest.py` | Shared LCU fixture loader and multi-player snapshot helper | None |
| `client/tests/test_parser.py` | Validator happy path, reject, mismatch, missing field | None |
| `client/tests/test_main.py` | `run()` skips POST and returns to `READY` on non-duel | None |
| `client/README.md` | Duel validation step, troubleshooting, related requirement link | None |

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| 2-player LCU fixture | Unit | `validate_duel_snapshot` passes | Yes |
| 5-player snapshot | Unit | `InvalidDuelError` with counts | Yes |
| Mismatched array lengths (2 vs 3) | Unit | `InvalidDuelError` | Yes |
| Missing `participantIdentities` | Unit | `InvalidDuelError` | Yes |
| `run()` with non-duel snapshot | Unit | No POST; state `READY`; warning log | Yes |
| Existing parser/collector/credential tests | Regression | All pass | Yes |
| Real non-1v1 custom in League | Manual smoke | Logged skip; client stays `READY` | N/A — deferred to M4 dogfood |
| Client import regression | Smoke | `import main` succeeds | Yes |

## Test Plan

### Unit Tests

- Validator matrix in `client/tests/test_parser.py`.
- `run()` non-duel recovery in `client/tests/test_main.py`.

### Integration Tests

- Not required; no server ingest boundary changed.

### E2E Tests

- Not required; send path remains `REQ-CAP-05`.

### Manual Smoke Tests

- Non-1v1 rejection in live League deferred to **M4 — Dogfood**. Automated tests use fixture-derived multi-player snapshots.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `client/tests/test_parser.py` | 2-player accept; 5-player reject; mismatch; missing identities |
| `client/tests/test_main.py` | `run()` recovery without POST on non-duel |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Lint | IDE diagnostics for changed files | Pass |
| Typecheck | N/A | Not Available — no mypy/pyright configured in `client/` |
| Unit tests | `cd client && uv run pytest` | Pass — 20 passed |
| Import smoke | `cd client && uv run python -c "import main; print('main import ok')"` | Pass |
| Build/deps | `cd client && uv sync` | Pass |
| Manual smoke | Real non-1v1 custom with League open | N/A — deferred to M4 dogfood |

## Manual Smoke Test

Steps (for M4 dogfood):

1. Start the capture client with League open.
2. Finish a custom game with more than two participants (or observe a non-1v1 session).
3. Confirm logs include `Skipping non-duel match snapshot` with participant counts and client remains `Ready for logging the match..`.

Result: **N/A for REQ-CAP-04**

Notes: Issue scope uses automated proof only. Live non-duel rejection is scheduled for milestone M4.

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Client-side sanity check only; authoritative validation remains on server per SystemArchitecture §7.3 |
| Security | Pass | No new credential or token logging paths |
| Error Handling | Pass | Dedicated `InvalidDuelError`; recoverable skip returns to `READY` |
| Maintainability | Pass | Validator is pure function; tests reuse fixture helpers |
| Performance | Pass | O(1) length checks before pack; no extra LCU calls |
| Scope Control | Pass | No server changes; cross-check rule per design alignment |

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
- [x] PR summary prepared

## Documentation Notes

### Changelog Entry

- Client rejects non-2-player LCU snapshots before POST with `InvalidDuelError`, cross-checking `participants` and `participantIdentities`, with pytest coverage for `REQ-CAP-04`.

### API Docs Update

- Not Required

### ADR

- Not Required

### Developer Notes

- Validation runs in `pack_data()` via `validate_duel_snapshot()` before `Packer.pack()`.
- Cross-check rule: both arrays must exist, each length 2, and lengths must match.

## PR Summary

### What changed

- Added `InvalidDuelError` and `validate_duel_snapshot()` with cross-check of `participants` and `participantIdentities`.
- Wired validation into `pack_data()`; `run()` logs a warning and returns to `READY` without POST on rejection.
- Added unit tests and updated client runbook.

### Why

- Closes `REQ-CAP-04`: client validates the game is a 2-player duel before sending.

### Tests

- `cd client && uv run pytest` — 20 passed
- `cd client && uv run python -c "import main; print('main import ok')"` — pass

### Risks

- Live LCU JSON may differ from fixture-derived multi-player snapshots; M4 dogfood validates operator-facing skip logs.

### Notes for reviewer

- Rejection is intentionally non-fatal (`READY`, not `FAILED`) so the host can capture the next duel without restart.
- Server-side winner derivation and 1v1 constraints remain `REQ-SRV-05` / `REQ-SRV-07`.

## Completion Decision

Status: Done

Reason: Acceptance criteria are covered by focused pytest tests, import smoke, and updated operator documentation. Manual League smoke deferred to M4 per agreed plan scope.

Remaining work:

- Publish PR with `Closes #10` via **publish-pull-request** skill.
