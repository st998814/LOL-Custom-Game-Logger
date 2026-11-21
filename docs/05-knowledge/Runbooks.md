# Runbooks

Operational guides for running and bootstrapping the LoL Custom Duel Ledger.

## MVP operator topology (REQ-OPS-01)

For MVP dogfood, the group runs an **operator-controlled stack** with PostgreSQL. Match data is **LCU-sourced only** — not Riot Match-V5 and not a third-party match host.

| Process / tier | Who runs it | Role |
|----------------|-------------|------|
| PostgreSQL | Group-owned connection (e.g. **Supabase** managed Postgres) | Data tier — ledger + raw-event queue |
| Express API (`npm run dev` / `npm start`) | Operator machine | Ingest + read APIs |
| Raw-event worker (`npm run worker`) | Operator machine | Persist `MATCH_SNAPSHOT` → matches |
| Telegram bot | Operator machine | Presentation — stats queries only |
| Capture agent (`capture_agent/`) | Host duelist’s PC (when capturing) | Edge ingest → `POST /api/events` |

**Bring-up:** follow [Dev bootstrap (3-tier stack)](playbooks/dev-bootstrap.md) (Data → Application → Presentation). Optional capture agent is §5 of that playbook.

**MVP vs production:** `REQ-OPS-01` is satisfied by this operator topology (Supabase + processes on a controlled machine). **Always-on production** (AWS EC2 + Docker Compose, public HTTPS for API + bot) is **`REQ-OPS-05`** / [DEC-004](./Decisions.md#dec-004--production-hosting-aws-ec2--compose) — see the [hosting plan](../04-execution/plans/hosting-backend-aws-ec2.md). Capture-agent packaging remains out of that plan.

## Production topology (REQ-OPS-05)

| Process / tier | Who runs it | Role |
|----------------|-------------|------|
| PostgreSQL | **Supabase** (unchanged) | Data tier |
| Express API + worker + Telegram bot + Caddy | **AWS EC2** via Docker Compose | Always-on application + presentation behind public HTTPS |

**Not in this topology yet:** downloadable capture-agent packages (hosts may still run the agent from a clone against the public API for dogfood).

## Playbooks

| Playbook | Audience | Description |
|----------|----------|-------------|
| [Dev bootstrap (3-tier stack)](playbooks/dev-bootstrap.md) | Developers / dogfood operators | Bring up **Data → Application → Presentation** from scratch |
| [Database setup & migrations](../01-architecture/Database.md) | Developers | Supabase/PostgreSQL connection strings, Prisma migrations, schema reference |
| [Hosting plan — AWS EC2 + Compose](../04-execution/plans/hosting-backend-aws-ec2.md) | Operators | Always-on API + worker + bot (`REQ-OPS-05`) |
| [Docker images](./playbooks/docker-images.md) | Operators / developers | Server + bot image builds, Prisma/tsx notes, ARM64 vs AMD64 |
| [Deploy / Caddy](../../deploy/README.md) | Operators | Public HTTPS allowlist, `caddy validate`, DOMAIN |
| [REQ-OPS-05 Workstream A verification](../04-execution/verification/REQ-OPS-05-workstream-a-verification.md) | Reviewers | Repo readiness evidence (not laptop-off acceptance) |

## Component runbooks

| Component | Tier | Guide |
|-----------|------|-------|
| `server/` | Application | [server/README.md](../../server/README.md) — Express API, worker, Prisma |
| `frontend/bot/` | Presentation | [frontend/bot/README.md](../../frontend/bot/README.md) — Telegram bot |
| `capture_agent/` | Edge ingest agent | [capture_agent/README.md](../../capture_agent/README.md) — LCU host capture (not a presentation-tier service) |

## Related docs

- [System architecture (3-tier)](../01-architecture/SystemArchitecture.md)
- [PRD — no Riot Match-V5](../00-product/PRD.md)
- [Troubleshooting](Troubleshooting.md)
- [Server implementation notes](../../server/docs/ARCHITECTURE.md)
