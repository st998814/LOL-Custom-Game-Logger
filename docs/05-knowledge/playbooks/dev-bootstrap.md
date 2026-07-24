# Dev bootstrap — 3-tier stack

Bring up the full local development stack in tier order: **Data → Application → Presentation**.

This playbook is the **MVP dogfood bring-up** path (REQ-OPS-01). For process roles, Postgres ownership, and what is deferred (production deploy), see [Runbooks — MVP operator topology](../Runbooks.md#mvp-operator-topology-req-ops-01).

The **LCU client** (`client/`) is an optional fourth step — an edge ingest agent, not part of the 3-tier UI stack. See [client/README.md](../../../client/README.md) when you need end-to-end match capture.

## Architecture map

| Order | Tier | Deployable | This guide |
|-------|------|------------|------------|
| 1 | **Data** | PostgreSQL (Supabase) | [§1 Data tier](#1-data-tier-postgresql) |
| 2 | **Application** | `server/` (API + worker) | [§2 Application tier](#2-application-tier-server) |
| 3 | **Presentation** | `frontend/bot/` (Telegram) | [§3 Presentation tier](#3-presentation-tier-telegram-bot) |
| — | Edge agent | `client/` (LCU capture) | [§5 Optional edge agent](#5-optional-edge-agent-lcu-client) |

Deeper per-component steps:

- [Database setup & migrations](../../01-architecture/Database.md)
- [server/README.md](../../../server/README.md)
- [frontend/bot/README.md](../../../frontend/bot/README.md)

---

## Prerequisites

| Tool | Used by | Notes |
|------|---------|-------|
| **Node.js 20+** | `server/` | ESM + TypeScript via `tsx` |
| **npm** | `server/` | Install deps in `server/` |
| **Python 3.12+** | `frontend/bot/`, `client/` | Bot and LCU client |
| **Supabase account** | Data tier | Free tier pauses after inactivity — restore from dashboard if frozen |
| **Telegram bot token** | Presentation tier | From [@BotFather](https://t.me/BotFather) |

---

## 1. Data tier (PostgreSQL)

PostgreSQL is hosted on **Supabase**. Only the application tier (`server/`) connects to it.

### 1.1 Create or restore a Supabase project

1. [Supabase dashboard](https://supabase.com/dashboard) → create a project (or **Restore** if paused).
2. Save the **database password** — it is shown only once at creation.
3. Region: pick one close to you (e.g. Asia-Pacific for AU).

Security toggles (Data API, RLS) can stay at defaults — the server connects as the `postgres` DB user and bypasses RLS.

### 1.2 Configure connection strings

Create `server/.env` (gitignored) with two URLs from **Project Settings → Database → Connect**:

```env
# Runtime — transaction pooler (port 6543)
DATABASE_URL="postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Migrations — direct connection (port 5432)
DIRECT_URL="postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

| Variable | Port | Used for |
|----------|------|----------|
| `DATABASE_URL` | 6543 + `?pgbouncer=true` | API + worker at runtime |
| `DIRECT_URL` | 5432 | `prisma migrate deploy` only |

If the password contains `@`, `#`, `%`, etc., URL-encode it or paste the full strings from the Supabase Connect panel.

Details: [Database.md](../../01-architecture/Database.md).

### 1.3 Apply schema

```bash
cd server
npm install
npx prisma generate
npx prisma migrate deploy
```

**Pass:** command exits 0 and reports applied migrations (`first_prisma_migration`, `game_id_bigint_to_int`, `add_raw_events`).

**Fail `P1000`:** wrong password or placeholder still in `.env` — reset password in Supabase and update both URLs.

### 1.4 Verify tables (optional)

```bash
npx prisma studio
```

Expect tables: `matches`, `players`, `match_players`, `raw_events`.

---

## 2. Application tier (`server/`)

Two processes share `server/.env` and `DATABASE_URL`:

| Process | Command | Port / role |
|---------|---------|-------------|
| **HTTP API** | `npm run dev` | `http://localhost:7871` — ingest + admin routes |
| **Worker** | `npm run worker` | Polls `raw_events`, processes `MATCH_SNAPSHOT` |

### 2.1 Start the API

Terminal 1:

```bash
cd server
npm run dev
```

**Pass:** `Server running on http://localhost:7871`

Smoke test:

```bash
curl http://localhost:7871/
# Hello World!
```

### 2.2 Start the worker

Terminal 2:

```bash
cd server
npm run worker
```

**Pass:** `Starting RawEventProcessor worker...`

Keep both terminals open while developing ingest/processing features.

Full reference: [server/README.md](../../../server/README.md).

---

## 3. Presentation tier (Telegram bot)

The bot is the **presentation tier** — it calls application **read APIs** only (no database access).

> **Current state:** `/stats`, `/stats recent`, and `/stats details` call server read APIs. Map Telegram user id → ledger `puuid` in `frontend/bot/config/player_map.json` (see example file).

### 3.1 Install and configure

```bash
cd frontend/bot
python3 -m venv .venv
source .venv/bin/activate
pip install python-telegram-bot
cp config/player_map.json.example config/player_map.json
```

```bash
export TELEGRAM_BOT_TOKEN="your-token-from-botfather"
export API_BASE_URL="http://127.0.0.1:7871"   # optional
```

Edit `config/player_map.json` with your Telegram user id and a `players.puuid` from the ledger.

### 3.2 Start the bot

```bash
python main.py
```

**Pass:** bot starts polling; `/test` → `testing`; mapped `/stats` → all-time W–L.

Full reference: [frontend/bot/README.md](../../../frontend/bot/README.md).

---

## 4. Smoke test (stack health)

With **Data + Application** running:

| Check | Command / action | Expected |
|-------|------------------|----------|
| API up | `curl http://localhost:7871/` | `Hello World!` |
| Ingest endpoint | `curl -X POST http://localhost:7871/api/events -H 'Content-Type: application/json' -d '{"eventType":"MATCH_SNAPSHOT","payload":{}}'` | HTTP 2xx (event queued) |
| Worker processing | Watch worker terminal | Poll loop running (no crash) |
| DB reachable | `cd server && npx prisma studio` | Tables visible |

With **Presentation** running:

| Check | Action | Expected |
|-------|--------|----------|
| Bot alive | Send `/test` in Telegram | `testing` |
| Stats (mapped) | Send `/stats` | All-time W–L from ledger |
| Stats API | `curl "http://127.0.0.1:7871/api/stats?puuid=PUUID"` | JSON `{ wins, losses, ... }` |

---

## 5. Optional: edge agent (LCU client)

Not required to validate the 3-tier stack. Use when testing **host → server** ingest end-to-end.

**Requires:** League client open on host machine, server API running at `http://127.0.0.1:7871`.

```bash
cd client
uv sync
uv run python main.py
```

See [client/README.md](../../../client/README.md) for bootstrap logs, duel validation, and troubleshooting.

---

## Startup order (quick reference)

```
1. Supabase project active + server/.env configured
2. cd server && npx prisma migrate deploy   (once per schema change)
3. Terminal A: cd server && npm run dev
4. Terminal B: cd server && npm run worker
5. Terminal C: cd frontend/bot && python main.py
6. (Optional) cd client && uv run python main.py   — host PC with League
```

---

## Troubleshooting

| Symptom | Tier | Fix |
|---------|------|-----|
| `P1000: Authentication failed` | Data | Real password in `server/.env`; reset in Supabase if needed |
| `DATABASE_URL is not defined` | Application | Create `server/.env`; run commands from `server/` |
| Migration advisory lock error | Data | Ensure `DIRECT_URL` uses port **5432**, not 6543 |
| `Failed to send payload to backend` | Edge agent | Start `npm run dev` in `server/` |
| Supabase project frozen | Data | Dashboard → **Restore project** (free tier pauses after ~7 days idle) |
| Bot does not respond | Presentation | Check token; ensure `python-telegram-bot` installed |

More: [Troubleshooting.md](../Troubleshooting.md).

---

## Related requirements

| REQ | Scope |
|-----|-------|
| REQ-SRV-01 | Server accepts raw events over HTTP (`POST /api/events`) |
| REQ-SRV-02 | Worker processes `MATCH_SNAPSHOT` into PostgreSQL |
| REQ-CAP-05 | LCU client sends snapshots to ingest endpoint |
