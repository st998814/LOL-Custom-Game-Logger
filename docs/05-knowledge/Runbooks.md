# Runbooks

Operational guides for running and bootstrapping the LoL Custom Duel Ledger.

## Playbooks

| Playbook | Audience | Description |
|----------|----------|-------------|
| [Dev bootstrap (3-tier stack)](playbooks/dev-bootstrap.md) | Developers | Bring up **Data → Application → Presentation** locally from scratch |
| [Database setup & migrations](../01-architecture/Database.md) | Developers | Supabase/PostgreSQL connection strings, Prisma migrations, schema reference |

## Component runbooks

| Component | Tier | Guide |
|-----------|------|-------|
| `server/` | Application | [server/README.md](../../server/README.md) — Express API, worker, Prisma |
| `frontend/bot/` | Presentation | [frontend/bot/README.md](../../frontend/bot/README.md) — Telegram bot |
| `client/` | Edge ingest agent | [client/README.md](../../client/README.md) — LCU host capture (not a presentation-tier service) |

## Related docs

- [System architecture (3-tier)](../01-architecture/SystemArchitecture.md)
- [Troubleshooting](Troubleshooting.md)
- [Server implementation notes](../../server/docs/ARCHITECTURE.md)
