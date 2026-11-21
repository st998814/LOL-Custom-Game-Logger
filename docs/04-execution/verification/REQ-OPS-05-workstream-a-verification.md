# REQ-OPS-05 — Workstream A verification report

Verification for repository readiness only ([issue #52](https://github.com/st998814/LOL-Custom-Game-Logger/issues/52)).  
**Does not** claim final production acceptance (laptop-off, live EC2 reboot, public HTTPS against real DNS) — that is Workstream B.

## Acceptance criteria (Workstream A)

- [x] A1–A8 implemented on `feat/52-req-ops-05-compose-stack`
- [x] Five Compose services: `api`, `worker`, `bot`, `caddy`, `redis`
- [x] API + worker share Server image; Redis internal-only; bot uses `http://api:7871/api/`
- [x] Prisma 7 generate in image build; one-shot `migrate` profile (not on worker restart)
- [x] Public write/admin controls + Caddy allowlist
- [x] Worker stale `PROCESSING` reclaim + idempotent match persist
- [x] Health/readiness + graceful shutdown
- [x] Unit tests isolated from production credentials
- [x] Docker images build; `docker compose config` validates; Caddyfile validates
- [ ] Workstream B: live EC2 / laptop-off / billing alarms (out of scope here)

## Commands run (A9)

### Unit / config tests (no production credentials)

```bash
# Server — vitest.setup.ts injects dummy DATABASE_URL; clears host AGENT/ADMIN keys
cd server && env -u DATABASE_URL -u AGENT_API_KEY -u ADMIN_API_TOKEN npm test

# Bot + capture agent config / HTTP header tests
cd frontend && .venv/bin/python -m unittest bot.test_config -v
cd capture_agent && .venv/bin/python -m pytest tests/test_configs.py tests/test_http_client.py -q
```

### Images + Compose + Caddy

```bash
docker build -t lol-ledger-server:local ./server
docker build -f frontend/bot/Dockerfile -t lol-ledger-bot:local ./frontend

DOMAIN=ledger.example.com \
DATABASE_URL='postgresql://u:p@h:6543/db' \
DIRECT_URL='postgresql://u:p@h:5432/db' \
AGENT_API_KEY='agent' ADMIN_API_TOKEN='admin' TG_BOT_API_TOKEN='tg' \
docker compose --profile migrate config

docker run --rm -e DOMAIN=ledger.example.com \
  -v "$PWD/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.8.4-alpine caddy validate --config /etc/caddy/Caddyfile
```

### Local Compose smoke checklist (dev secrets only — never production match data)

| Check | How | Expected |
|-------|-----|----------|
| Compose graph | `docker compose config --services` | `redis api worker bot caddy` (+ `migrate` with profile) |
| No public API/Redis ports | Inspect config | Only `80`/`443` published |
| Env split | Inspect `migrate` / `bot` / `caddy` blocks | migrate=`DIRECT_URL` only; bot/caddy have no DB URLs |
| Image entrypoints | `docker run --rm --entrypoint ...` | Server has Prisma client + tsx; bot imports `bot` |
| Stack up (optional local) | `.env` with **non-prod** Supabase or local Postgres | `/healthz` via Caddy; bot→api on Docker network |
| Migrate one-shot | `docker compose --profile migrate run --rm migrate` | Against **non-prod** DB only |
| Auth negatives | Covered by unit suites | 401 without/invalid agent/admin credentials |
| Worker reclaim | Covered by unit suites | Stale PROCESSING → PENDING; idempotent persist |

## Evidence notes (recorded A9)

| Area | Result |
|------|--------|
| Server unit suite | **20 files / 174 tests passed** with `env -u DATABASE_URL -u AGENT_API_KEY -u ADMIN_API_TOKEN` |
| Bot `API_BASE_URL` tests | **4 passed** |
| Capture agent config + `X-Agent-Key` header tests | **10 passed** |
| Docker server/bot builds | Pass (re-verified A9) |
| Compose + migrate profile | Services: `redis api bot caddy migrate worker` |
| Caddy validate | `Valid configuration` |
| Production data | **Not** touched |

## Explicit non-claims

- No EC2 provisioning, DNS, or billing alarms
- No production Supabase writes
- Final REQ-OPS-05 laptop-off acceptance deferred to Workstream B
