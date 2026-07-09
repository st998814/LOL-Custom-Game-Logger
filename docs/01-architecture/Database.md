# Database — Data tier

PostgreSQL is the **data tier**. It is reachable **only from the application tier** (`server/`) via Prisma. Presentation (`frontend/bot/`) and the edge agent (`client/`) must never hold `DATABASE_URL`.

See [SystemArchitecture.md](SystemArchitecture.md) §8 for entity overview.

## Hosting

Development uses **Supabase** (managed PostgreSQL). Any Postgres 14+ provider works as long as you supply compatible connection strings.

## Connection strings

Configure in `server/.env` (gitignored):

```env
# Runtime — transaction pooler (port 6543)
DATABASE_URL="postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Migrations — direct connection (port 5432)
DIRECT_URL="postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

Copy both from **Supabase → Project Settings → Database → Connect**.

| Variable | Consumer | Notes |
|----------|----------|-------|
| `DATABASE_URL` | `src/db/prisma.ts` (API + worker) | Use pooler port **6543** with `?pgbouncer=true` |
| `DIRECT_URL` | `prisma.config.ts` (migrations only) | Use direct port **5432**; pooler cannot take advisory locks |

URL-encode special characters in passwords, or paste pre-built strings from the Supabase dashboard.

## Schema ownership

| Artifact | Path |
|----------|------|
| Prisma schema | `server/prisma/schema.prisma` |
| Migrations | `server/prisma/migrations/` |
| Generated client | `server/generated/prisma/` (run `npx prisma generate`; gitignored) |
| Runtime client | `server/src/db/prisma.ts` |

This project uses **Prisma 7**:

- Migration URL is in `server/prisma.config.ts` (`DIRECT_URL`), not in `schema.prisma`.
- Runtime uses `@prisma/adapter-pg` with `DATABASE_URL`.

Do **not** follow Supabase’s generic `prisma init` template that puts `url` / `directUrl` inside `schema.prisma` — that conflicts with this setup.

## Bootstrap (new database)

From `server/`:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

Existing migrations (applied in order):

| Migration | Purpose |
|-----------|---------|
| `20260128143135_first_prisma_migration` | `matches`, `players`, `match_players` |
| `20260213135140_game_id_bigint_to_int` | `game_id` BIGINT → INTEGER |
| `20260308095640_add_raw_events` | `raw_events` queue + `RawEventStatus` enum |

Verify:

```bash
npx prisma studio
```

## Core tables

| Table | Model | Purpose |
|-------|-------|---------|
| `raw_events` | `RawEvent` | Async ingest queue (`PENDING` → `PROCESSED` / `FAILED`) |
| `matches` | `Match` | One row per custom duel (`game_id` PK) |
| `players` | `Player` | Identity (`puuid`, `game_name`, `tag_line`) |
| `match_players` | `MatchPlayer` | Per-participant stats; unique `(game_id, team_id)` enforces 1v1 |

## Day-to-day commands

```bash
cd server

npx prisma generate          # After schema.prisma changes
npx prisma migrate deploy    # Apply migrations to remote DB
npx prisma migrate dev         # Create new migration (local dev)
npx prisma studio              # GUI browser for data
npx prisma db pull --print     # Compare DB to schema (debug)
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `P1000: Authentication failed` | Wrong password or `[YOUR-PASSWORD]` placeholder | Reset DB password in Supabase; update `.env` |
| Advisory lock / migration fails on 6543 | `DIRECT_URL` points at pooler | Use port **5432** for `DIRECT_URL` |
| `DATABASE_URL is not defined` | Missing `.env` | Create `server/.env` |
| Project frozen / connection timeout | Supabase free tier paused | Dashboard → **Restore project** |
| Empty `generated/prisma` | Client not generated | `npx prisma generate` |

## Data migration (optional)

If replacing a frozen Supabase project and you have a dump from the old DB:

```bash
pg_dump "$OLD_DIRECT_URL" --data-only \
  --table=matches --table=players --table=match_players --table=raw_events \
  > data.sql

psql "$NEW_DIRECT_URL" < data.sql
```

Skip for greenfield dev — `migrate deploy` on an empty DB is enough.

## Related docs

- [Dev bootstrap](../05-knowledge/playbooks/dev-bootstrap.md)
- [server/README.md](../../server/README.md)
- [server/docs/ARCHITECTURE.md](../../server/docs/ARCHITECTURE.md)
