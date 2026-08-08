# REQ-OPS-01 — Verification report

Verification for issue [#34](https://github.com/st998814/LOL-Custom-Game-Logger/issues/34).

## Acceptance Criteria Review

- [x] Documented MVP stack: operator-controlled API + worker + bot, PostgreSQL (group-owned connection; managed Postgres OK)
- [x] Docs state that match data is LCU-sourced — no Riot Match-V5 API and no third-party match hosting
- [x] Dev/dogfood bootstrap path is sufficient to run the stack (existing playbooks reviewed; gaps fixed if any)
- [x] Production deploy (Docker/VPS/systemd) explicitly out of MVP scope for this requirement
- [x] Verification artifact recorded under `docs/04-execution/verification/`

## Changed Files Review

| File | Change Summary | Concern |
|------|----------------|---------|
| `docs/05-knowledge/Runbooks.md` | MVP operator topology section (processes, Postgres ownership, LCU-only, deploy deferred) | None |
| `docs/05-knowledge/playbooks/dev-bootstrap.md` | Linked as REQ-OPS-01 dogfood bring-up path | None |
| `README.md` | Points operators to topology + bootstrap | None |
| `docs/00-product/UserStories.md` | `REQ-OPS-01(Done)` | None |
| `docs/04-execution/verification/REQ-OPS-01-verification.md` | This report | None |
| `client/lcu/credential_resolver.py` | Prefer `LeagueClientUx` over Riot Client ports (same PR, not ops AC) | Separate from ops criteria |
| `client/tests/test_credential_resolver.py` | Unit coverage for UX vs Riot Client / Helper | Separate from ops criteria |

No Docker Compose, VPS, or systemd runbooks were added.

## Test Matrix

| Scenario | Test Type | Expected Result | Covered |
|----------|-----------|-----------------|----------|
| Follow Data → App → Bot (dev-bootstrap) | Manual smoke | Stack reaches runnable state with Postgres | Yes |
| API + worker processes up | Manual smoke | API responds; worker started | Yes |
| No Match-V5 / third-party match host in MVP design or runtime | Manual / grep | Mentions only as non-goals; no runtime integration | Yes |
| Operator topology documented | Doc review | Processes + Postgres ownership clear; deploy deferred | Yes |
| Credential resolver prefers LeagueClientUx | Unit | Tests pass | Yes (PR scope) |

## Test Plan

### Manual / review

- Confirm [Runbooks — MVP operator topology](../../05-knowledge/Runbooks.md#mvp-operator-topology-req-ops-01) lists API, worker, bot, PostgreSQL (Supabase OK), and LCU client roles
- Confirm [dev-bootstrap.md](../../05-knowledge/playbooks/dev-bootstrap.md) is the bring-up path and production deploy is deferred
- Confirm [PRD out of scope](../../00-product/PRD.md) states no Riot Match-V5
- Grep repo for Match-V5 / Riot Match API host usage outside non-goal docs

### Manual smoke (dogfood)

| Check | Evidence |
|-------|----------|
| Data tier | `server/.env` has `DATABASE_URL` (Supabase Postgres; value not recorded) |
| API | `npm run dev` → `curl http://localhost:7871/` → `Hello World!` |
| Worker | `npm run worker` → log `Starting RawEventProcessor worker...` |

### Unit (same PR — credential fix)

- `cd client && uv run pytest tests/test_credential_resolver.py -q`

## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
| `client/tests/test_credential_resolver.py` | Prefer LeagueClientUx; ignore Riot Client / Helper |

Ops criteria themselves do not require new automated server tests.

## Verification Results

| Check | Command / review | Result |
|-------|------------------|--------|
| Topology docs | Review Runbooks + README + bootstrap links | Pass |
| No Match-V5 runtime | Grep `Match-V5`, `api.riotgames`, third-party match host | Pass — only non-goal docs |
| API smoke | `curl http://localhost:7871/` | Pass — `Hello World!` |
| Worker smoke | Terminal running `npm run worker` | Pass — started |
| Credential unit tests | `uv run pytest tests/test_credential_resolver.py -q` | Pass — 7 tests |

## Self Review

| Area | Result | Notes |
|------|--------|-------|
| Architecture | Pass | Operator-controlled 3-tier + edge LCU; Postgres only via server |
| Security | Pass | No secrets in verification artifact; `.env` not committed |
| Maintainability | Pass | Single topology source in Runbooks; bootstrap linked |
| Scope Control | Pass | No production deploy tooling; credential fix called out separately |

## PR Summary (draft)

- Document and verify MVP dogfood topology (API + worker + bot + group-owned Postgres).
- Record that Match-V5 / third-party match hosting remain out of scope; production deploy deferred.
- Prefer LeagueClientUx when resolving LCU credentials (related capture reliability fix on the same branch).

Closes #34
