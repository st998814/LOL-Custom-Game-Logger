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
| LCU client (`client/`) | Host duelist’s PC (when capturing) | Edge ingest → `POST /api/events` |

**Bring-up:** follow [Dev bootstrap (3-tier stack)](playbooks/dev-bootstrap.md) (Data → Application → Presentation). Optional LCU client is §5 of that playbook.

**Out of MVP scope:** production deployment (Docker Compose, VPS, systemd, always-on hosting runbooks). Defer post-MVP.

## Playbooks

| Playbook | Audience | Description |
|----------|----------|-------------|
| [Dev bootstrap (3-tier stack)](playbooks/dev-bootstrap.md) | Developers / dogfood operators | Bring up **Data → Application → Presentation** from scratch |
| [Database setup & migrations](../01-architecture/Database.md) | Developers | Supabase/PostgreSQL connection strings, Prisma migrations, schema reference |

## Component runbooks

| Component | Tier | Guide |
|-----------|------|-------|
| `server/` | Application | [server/README.md](../../server/README.md) — Express API, worker, Prisma |
| `frontend/bot/` | Presentation | [frontend/bot/README.md](../../frontend/bot/README.md) — Telegram bot |
| `client/` | Edge ingest agent | [client/README.md](../../client/README.md) — LCU host capture (not a presentation-tier service) |

## Related docs

- [System architecture (3-tier)](../01-architecture/SystemArchitecture.md)
- [PRD — no Riot Match-V5](../00-product/PRD.md)
- [Troubleshooting](Troubleshooting.md)
- [Server implementation notes](../../server/docs/ARCHITECTURE.md)
