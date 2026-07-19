# Server — Application tier

Express API + async worker. Sole gateway to PostgreSQL (Prisma). Part of the **application / logic tier** in the [3-tier architecture](../docs/01-architecture/SystemArchitecture.md).

## What runs here

| Process | Entry | Purpose |
|---------|-------|---------|
| **HTTP API** | `src/index.ts` | Ingest (`POST /api/events`), admin routes, stats read APIs |
| **Worker** | `src/worker.ts` | Polls `raw_events`, processes `MATCH_SNAPSHOT` payloads |

Both processes load `server/.env` and share the same Prisma client (`src/db/prisma.ts`).

## Prerequisites

- **Node.js 20+**
- **PostgreSQL** — Supabase project configured; see [Database.md](../docs/01-architecture/Database.md)
- `server/.env` with `DATABASE_URL` and `DIRECT_URL`

## Install

```bash
cd server
npm install
npx prisma generate
```

After schema changes or first clone:

```bash
npx prisma migrate deploy
```

## Environment

Create `server/.env` (never commit):

```env
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@...:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[PASSWORD]@...:5432/postgres"
```

| Variable | Used by |
|----------|---------|
| `DATABASE_URL` | Runtime (API + worker) — transaction pooler, port 6543 |
| `DIRECT_URL` | `prisma migrate deploy` only — direct connection, port 5432 |

## Start (development)

**Terminal 1 — API** (port `7871`):

```bash
npm run dev
```

**Terminal 2 — worker**:

```bash
npm run worker
```

Production-style start (no watch):

```bash
npm start
npm run worker
```

## HTTP surface

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Health smoke (`Hello World!`) |
| `POST` | `/api/events` | Ingest raw events (REQ-SRV-01) |
| `GET` | `/api/stats?puuid=` | All-time W–L (REQ-BOT-01 / REQ-BOT-04) |
| `GET` | `/api/stats/recent?puuid=` | Last 5 duels (REQ-BOT-02) |
| `GET` | `/api/stats/details?puuid=` | All-time detail (REQ-BOT-03) |
| — | `/api/admin/...` | Admin raw-event routes (see `src/routes/`) |

Default local base URL: `http://127.0.0.1:7871`

Stats responses use stored `winningTeamId` (DEC-001). Missing `puuid` → `400`; unknown player → `404`; known player with no matches → `200` with zeros / empty lists.

### `POST /api/events` — ingest contract

| Status | When | Body |
|--------|------|------|
| `202` | New valid snapshot queued | `{ "id": "<raw_event_id>", "status": "PENDING" }` |
| `400` | Invalid payload shape | `{ "error": "<message>", "code": "<CODE>" }` |
| `409` | Duplicate snapshot (same `game_id` / dedup key) | `{ "error": "<message>", "code": "DUPLICATE_SNAPSHOT", "existingId": "<id>"? }` |

Validation `code` examples: `INVALID_EVENT_TYPE`, `MISSING_GAME_ID`, `INVALID_PLAYERS_COUNT`.

Ingest smoke test (use seed fixture from repo root):

```bash
# First POST for a game_id → 202
curl -s -X POST http://127.0.0.1:7871/api/events \
  -H 'Content-Type: application/json' \
  -d @client/data/seed/payload.json

# Same payload again → 409 DUPLICATE_SNAPSHOT
curl -s -X POST http://127.0.0.1:7871/api/events \
  -H 'Content-Type: application/json' \
  -d @client/data/seed/payload.json

# Invalid body → 400
curl -s -X POST http://127.0.0.1:7871/api/events \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Project layout

```
server/
├── prisma/
│   ├── schema.prisma      # Data models
│   └── migrations/        # Applied via migrate deploy
├── prisma.config.ts       # Migration datasource (DIRECT_URL)
├── src/
│   ├── index.ts           # API entry
│   ├── worker.ts          # Worker entry
│   ├── app.ts             # Express app + routes
│   ├── db/prisma.ts       # Shared Prisma client
│   ├── routes/            # HTTP routing
│   ├── controllers/       # Request adaptation
│   ├── services/          # Business logic
│   ├── models/            # Prisma queries
│   └── workers/           # Background processors
└── generated/prisma/      # Prisma client output (gitignored; run generate)
```

Implementation notes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Common commands

```bash
npx prisma generate          # Regenerate client after schema change
npx prisma migrate deploy    # Apply migrations to remote DB
npx prisma studio            # Browse data in browser
npm test                     # Unit + HTTP tests (mocked DB)
npm run test:integration     # Live PostgreSQL ingest + matchSnapshot persistence tests (requires server/.env)
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `DATABASE_URL is not defined` | Add `server/.env`; run from `server/` directory |
| `P1000: Authentication failed` | Fix password in `.env`; see [Database.md](../docs/01-architecture/Database.md) |
| Import errors from `generated/prisma` | Run `npx prisma generate` |
| Worker idle, events stuck `PENDING` | Ensure `npm run worker` is running in a second terminal |

## Related docs

- [Dev bootstrap (full stack)](../docs/05-knowledge/playbooks/dev-bootstrap.md)
- [Database setup](../docs/01-architecture/Database.md)
- [Ingest API contract](../docs/01-architecture/API.md)
- [REQ-SRV-01 verification](../docs/04-execution/verification/REQ-SRV-01-verification.md)
- [REQ-SRV-02 verification](../docs/04-execution/verification/REQ-SRV-02-verification.md)
- [LCU client ingest](../client/README.md)
