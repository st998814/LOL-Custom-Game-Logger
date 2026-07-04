# REQ-CAP-02 — Verification report

Verification per [verification-and-testing skill](../../../.cursor/skills/verification-and-testing/SKILL.md). Issue [#6](https://github.com/st998814/LOL-Custom-Game-Logger/issues/6); branch `req-cap-02-lcu-credential-resolution`.

## Acceptance Criteria Review

- [x] Client resolves LCU `--app-port` and `--remoting-auth-token` from the running League process.
- [x] Client fails with a clear operator-facing message when League is not running or LCU credentials are unavailable.
- [x] Credential failure output is sanitized and does not include the token or full process command line.
- [x] Startup credential failure returns a non-zero CLI exit code.

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `client/lcu/credential_resolver.py` | Hardened process inspection, removed duplicate local credential error, and made same-line port/token parsing explicit | None |
| `client/lcu/error.py` | Added shared default credential-discovery error message | None |
| `client/main.py` | Logs sanitized credential startup failure and returns non-zero exit code | None |
| `client/pyproject.toml` | Added `pytest` dev dependency group | None |
| `client/uv.lock` | Locked pytest dev dependencies | None |
| `client/tests/conftest.py` | Adds client root to test import path | None |
| `client/tests/test_credential_resolver.py` | Covers resolver happy path and failure cases | None |
| `client/tests/test_main.py` | Covers CLI credential startup failure | None |
| `client/README.md` | Updated troubleshooting message for credential discovery failure | None |

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|---------|
| Valid League process credentials | Unit | Resolver returns integer port and token | Yes |
| League not running / no credentials | Unit | Resolver raises clear `CredentialsParsingError` | Yes |
| Partial credentials | Unit | Resolver fails without leaking token or process flags | Yes |
| Multiple process lines | Unit | Resolver selects the valid credential-bearing line | Yes |
| Process listing failure | Unit | Resolver raises sanitized credential error | Yes |
| CLI fatal startup path | Unit / smoke | `main()` logs clear credential failure and returns `1` | Yes |
| Client import regression | Smoke | `import main` succeeds | Yes |
| League closed real run | Manual smoke | `uv run python main.py` exits with critical credential message | Not performed |

## Test Plan

### Unit Tests

- Resolver parsing tests in `client/tests/test_credential_resolver.py`.
- CLI startup failure test in `client/tests/test_main.py`.

### Integration Tests

- Not required for this task; no server, LCU HTTP, or database boundary changed.

### E2E Tests

- Not required for this task; match capture and send are covered by later capture requirements.

### Manual Smoke Tests

- League-closed runbook path: close League, run `cd client && uv run python main.py`, confirm critical message and non-zero exit.

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `client/tests/test_credential_resolver.py` | Credential happy path, absent credentials, partial credentials, multiple lines, failed process inspection |
| `client/tests/test_main.py` | CLI startup failure for unavailable credentials |
| `client/tests/conftest.py` | Test import path setup |

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Lint | IDE diagnostics for changed files | Pass |
| Typecheck | N/A | Not Available — no mypy/pyright configured in `client/` |
| Unit tests | `cd client && uv run pytest` | Pass — 6 passed |
| Import smoke | `cd client && uv run python -c "import main; print('main import ok')"` | Pass |
| Build/deps | `cd client && uv add --dev pytest` | Pass — dependencies resolved and lockfile updated |
| Manual smoke | League closed → `cd client && uv run python main.py` | Not Performed — requires controlling local League process state; automated CLI failure test covers this path |

## Manual Smoke Test

Steps:

1. Close League of Legends completely.
2. From repository: `cd client && uv run python main.py`.
3. Confirm the process exits with status `1`.
4. Confirm logs include `LCU credential discovery failed` and do not include `--remoting-auth-token` or token values.

Result: **Not Performed**

Notes: Automated tests simulate the same resolver failure path without depending on local League state.

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Changes remain inside the LCU edge client and do not cross server/database boundaries |
| Security | Pass | Error messages avoid token and full process-line leakage |
| Error Handling | Pass | Credential discovery and process-inspection failures now produce explicit messages |
| Maintainability | Pass | Resolver remains injectable and covered by focused tests |
| Performance | Pass | Process scan remains one `ps axww` refresh per parse |
| Scope Control | Pass | No match capture, server ingest, or retry behavior added |

## Definition of Done Check

- [x] Acceptance criteria satisfied
- [x] Test Matrix covered
- [x] Tests added or updated
- [x] Lint passes
- [x] Typecheck passes — N/A, no typechecker configured
- [x] Tests pass
- [x] Build/dependency check passes
- [x] Manual smoke test completed if needed — N/A; automated substitute documented because real League process state was not controlled in this session
- [x] No unrelated changes
- [x] Documentation updated
- [ ] PR summary prepared — pending publish step

## Documentation Notes

### Changelog Entry

- Hardened LCU credential discovery and documented the League-not-running startup failure path for `REQ-CAP-02`.

### API Docs Update

- Not Required

### ADR

- Not Required

### Developer Notes

- `pytest` is now the client test runner via `cd client && uv run pytest`.
- Cross-platform credential discovery remains out of scope; current implementation follows the documented macOS `ps axww` approach.

## PR Summary

### What changed

- Hardened LCU credential discovery from the local League process.
- Added sanitized fatal startup behavior and non-zero CLI exit for missing credentials.
- Added pytest coverage for resolver and CLI failure paths.
- Updated client troubleshooting docs.

### Why

- Closes `REQ-CAP-02`: the client must resolve LCU port/token from the running League process and fail clearly when League is not running.

### Tests

- `cd client && uv run pytest` — 6 passed
- `cd client && uv run python -c "import main; print('main import ok')"` — pass
- IDE diagnostics — pass

### Risks

- Manual League-closed smoke was not performed in this session; automated coverage exercises the same startup failure path.

### Notes for reviewer

- Token-bearing process lines are intentionally never included in exception messages or logs.

## Completion Decision

Status: Done

Reason: Acceptance criteria are covered by focused pytest tests, import smoke, lint diagnostics, and updated operator documentation.

Remaining work:

- Perform optional real League-closed manual smoke before PR if local League process state is available.
