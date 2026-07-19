# LoL Custom Duel Ledger — System Design

**Steven** — Jun 25, 2026

This document describes the **system architecture** and **per-component internal architecture** for the LoL Custom Duel Ledger. It complements the product requirements in [PRD.md](../00-product/PRD.md), [User Stories](../00-product/UserStories.md), and [Roadmap](../00-product/Roadmap.md), plus the server implementation notes in [server/docs/ARCHITECTURE.md](../../server/docs/ARCHITECTURE.md).

*Unofficial fan tool — not affiliated with or endorsed by Riot Games.*

---

## 1. Purpose

The duel ledger is a small, self-hosted tool for a private friend group:

- **Capture** custom 1v1 match results automatically from the League Client (LCU).
- **Persist** a shared, deduplicated ledger in PostgreSQL.
- **Query** win/loss and match history through a Telegram bot.

This document answers:

1. How the **whole product** is structured (multi-tier system).
2. How each **deployable component** is structured internally.
3. What **boundaries and contracts** must not be crossed.

---

## 2. System architecture (3-tier)

The product follows a **strict 3-tier architecture**. Components map to logical tiers; communication across tiers uses **HTTP APIs** (JSON), not shared database access from UI or edge clients.

### 2.1 Tier overview

| Tier | Responsibility | Deployable |
|------|----------------|------------|
| **Presentation** | Display information; translate user interaction into API calls. No business rules. No database access. | `frontend/bot/` (Telegram) |
| **Application / logic** | Enforce business rules; ingest and process events; expose read/write APIs; run async workers. Sole gateway to storage. | `server/` (Express API + worker) |
| **Data** | Durable persistence, isolated from direct user or UI access. | PostgreSQL |

**Local bootstrap:** [Dev playbook (3-tier)](../05-knowledge/playbooks/dev-bootstrap.md) · [Database setup](Database.md) · [Runbooks index](../05-knowledge/Runbooks.md)

### 2.2 Edge ingest agent (outside presentation)

The **LCU client** (`client/`) is **not** the presentation tier. Users do not query stats through it. It runs on the **host duelist's PC**, reads match metadata from League Client at game end, and **POSTs to the application tier** only. It must never connect to PostgreSQL.

### 2.3 System diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION TIER                                                      │
│  Telegram bot  ──HTTP (read APIs)──►                                    │
└───────────────────────────────────────────────┬─────────────────────────┘
                                                │
┌───────────────────────────────────────────────▼─────────────────────────┐
│  APPLICATION / LOGIC TIER                                               │
│  Express API  ◄──HTTP POST /api/events──  LCU client (edge agent)       │
│  Raw-event worker  ──►  validation, dedupe, match processing             │
└───────────────────────────────────────────────┬─────────────────────────┘
                                                │  Prisma (application tier only)
┌───────────────────────────────────────────────▼─────────────────────────┐
│  DATA TIER                                                              │
│  PostgreSQL                                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Deployable map

| Path | System role | Arch. tier |
|------|-------------|------------|
| `frontend/bot/` | User-facing stats and history (Telegram) | Presentation |
| `server/` | Ingest, processing, query APIs, admin | Application |
| `client/` | LCU capture and outbound ingest | Edge agent → application |
| PostgreSQL | Ledger storage | Data |

### 2.5 Architectural rules (mandatory)

1. **Presentation → application only.** The Telegram bot calls application **read APIs**. It must not use Prisma, SQL, or `DATABASE_URL`.
2. **Application owns business logic.** Validation, deduplication, winner derivation, and stats aggregation live in `server/`, not in the bot or LCU client.
3. **Application → data only.** PostgreSQL is reachable only from the application tier. Schema and migrations are owned by `server/prisma/`.
4. **Edge agent → application ingest only.** The LCU client POSTs raw events (`POST /api/events`). It does not read the ledger.
5. **No tier skipping.** Presentation must not read PostgreSQL directly. The edge agent must not write to PostgreSQL directly.
6. **HTTP contracts between tiers.** Cross-tier integration is defined by JSON request/response shapes, not by sharing ORM models.

### 2.6 What this is not

| Label | Applies? | Notes |
|-------|----------|-------|
| **3-tier architecture** | Yes | Presentation, application, data — with strict boundaries. |
| **Microservices** | No | One application deployable (API + worker), one database. |
| **Monorepo** | Yes (today) | Multiple apps in one repo; tier boundaries are logical, not repo boundaries. |

---

## 3. End-to-end flows

### 3.1 Ingest flow (duel capture)

```
Custom 1v1 ends
  → LCU client polls LCU, fetches match snapshot
  → client transforms raw JSON to MATCH_SNAPSHOT payload
  → POST /api/events (application tier)
  → raw event queued (PENDING)
  → worker processes event, validates, persists Match / Player / MatchPlayer
  → PostgreSQL (data tier)
```

### 3.2 Query flow (stats / history)

```
User sends /stats (or subcommand) in Telegram
  → bot handler parses command
  → bot service calls application read API
  → application tier queries PostgreSQL, applies business rules
  → JSON response returned to bot
  → bot presenter formats Telegram reply
```

### 3.3 Core user loop

```
Custom 1v1 ends
  → LCU client POSTs to application tier
  → worker writes data tier
  → player runs /stats in Telegram
  → bot GETs application read API
  → formatted reply
```

---

## 4. Component architectures

Each deployable uses an internal structure **appropriate to its tier**. Components do not all share the same folder layout; they share the same **system boundaries**.

| Component | Internal architecture | Summary |
|-----------|----------------------|---------|
| Server (API) | **Layered** | routes → controllers → services → models |
| Server (worker) | **Job processor** (reuses services/models) | Same domain layer as API |
| Telegram bot | **Presentation-layered** | handlers → services → API client (+ presenters) |
| LCU client | **Pipeline / adapters** | orchestration → LCU adapter → transform → transport |
| PostgreSQL | **Relational, server-owned** | Schema via Prisma; access only from application tier |

---

## 5. Application tier — server

The application tier is a **layered monolith**: one Express app, one worker process, one Prisma schema, one PostgreSQL database.

Detailed server layering is documented in [server/docs/ARCHITECTURE.md](../server/docs/ARCHITECTURE.md). This section summarizes how it fits the system.

### 5.1 Processes

| Entry point | Role |
|-------------|------|
| `server/src/index.ts` | HTTP server (port `7871` by default) |
| `server/src/worker.ts` | Background loop: poll `RawEvent`, process `MATCH_SNAPSHOT` |

Both processes share `server/src/` code and `DATABASE_URL`. They are **two runtime entry points of one application tier**, not separate microservices.

### 5.2 Layered stack (HTTP)

```
Routes        HTTP paths, middleware wiring
    ↓
Controllers   Request/response adaptation, status codes, error mapping
    ↓
Services      Business rules, orchestration, invariants
    ↓
Models        Prisma queries and transactions
    ↓
PostgreSQL
```

**Dependency rule:** `routes → controllers → services → models` (one way). Controllers do not call Prisma directly. Models do not know about Express.

**Build order for new features:** model → service → controller → route.

### 5.3 Worker and layering

The worker should **reuse the same services and models** as the HTTP API wherever possible:

```
Worker job handler  →  service  →  model  →  PostgreSQL
```

Avoid a parallel persistence path that bypasses services (e.g. calling Prisma inline for domain writes). *Current codebase: match persistence in the worker still uses Prisma directly in places — target state is full service reuse.*

### 5.4 Domain responsibilities (application tier)

| Concern | Owner |
|---------|--------|
| Raw event ingest and deduplication | `rawEvent.service` |
| Async match snapshot processing | Worker + match/domain services |
| 1v1 validation, duplicate `gameId` rejection | Application services |
| Winner derivation | Application services |
| Stats aggregation for bot | Application services + read APIs |
| Admin inspect/replay of failed events | `rawEventAdmin` routes/services |

### 5.5 Target folder layout

```
server/src/
  routes/           # HTTP wiring
  controllers/      # HTTP adapters
  services/         # Business logic
  models/           # Data access (Prisma)
  workers/          # Async job loops
  db/               # Prisma client bootstrap
  types/            # Shared DTOs / contracts
```

---

## 6. Presentation tier — Telegram bot

The bot is a **thin presentation adapter**. It is **presentation-layered** — a form of layered architecture, but **not** the same as the server's full application stack.

### 6.1 Presentation-layered stack

```
Handlers        Telegram commands, callbacks, user context
    ↓
Services        Command intent → API call orchestration, error mapping
    ↓
API client      HTTP to application read APIs
    ↓
(Optional) Presenters   Format API JSON into Telegram messages
```

**Dependency rule:** Handlers do not call HTTP directly. The API client does not format Telegram messages or parse `/stats` syntax.

### 6.2 Bot "services" vs server "services"

| | Bot service | Server service |
|---|-------------|----------------|
| **Purpose** | Map user command to API request; handle presentation errors | Enforce ledger rules; compute stats; persist data |
| **Owns business rules?** | No | Yes |
| **Talks to database?** | No | Yes (via models) |

### 6.3 Target folder layout

```
frontend/bot/
  handlers/         # CommandHandler wiring (/stats, etc.)
  services/         # Per-command orchestration
  clients/          # HTTP client for server read APIs
  presenters/       # Message formatting
  config/           # Token, base URL, command registry
  main.py           # Entry point
```

### 6.4 Current state

`frontend/bot/` follows the presentation-layered layout (handlers → services → API client → presenters). Telegram → ledger identity uses a local puuid map until `REQ-BOT-05`.

---

## 7. Edge ingest agent — LCU client

The LCU client is an **integration pipeline**, not a CRUD app. It does not use routes/controllers/models. Its job is sequential: discover credentials → poll game state → fetch match → transform → send.

### 7.1 Pipeline stack

```
App orchestration (main.py)     Lifecycle, state machine, retries
    ↓
LCU adapter (lcu/)              Credential resolution, HTTP to League Client
    ↓
Transform (data/parser.py)      Raw LCU JSON → MATCH_SNAPSHOT DTO
    ↓
Transport (api.py)              POST to application tier
```

### 7.2 Responsibilities by module

| Module | Responsibility |
|--------|----------------|
| `main.py` | Bootstrap, `AppState`, orchestrate collect → pack → send |
| `lcu/credential_resolver.py` | Parse port/token from running League process |
| `lcu/agent.py` | `Connection`, `Colloctor` — poll game flow, fetch match data |
| `data/parser.py` | `Filter`, `Packer` — extract duel fields for ingest payload |
| `api.py` | `ClientRequests` — POST to `http://…:7871/api/events` |
| `lcu/error.py` | Client-side error types |

### 7.3 Capture-time vs application-time validation

| Check | Where |
|-------|--------|
| 2-player duel before send (client-side sanity) | LCU client (target; align with PRD) |
| Deduplication, 1v1 DB constraints, winner | Application tier only |

The client may reject obviously invalid snapshots early; **authoritative** validation remains in the application tier.

### 7.4 Current state

The pipeline shape exists in `client/main.py` (`collect_match_payload` → `pack_data` → `send_payload`). Folder names (`data/`, `lcu/`, `api.py`) match the pipeline model; a future refactor may rename `api.py` → `transport/` for clarity.

---

## 8. Data tier — PostgreSQL

### 8.1 Ownership

- Schema: `server/prisma/schema.prisma`
- Migrations: `server/prisma/migrations/`
- Access: **application tier only** via Prisma (`server/src/db/prisma.ts`)

### 8.2 Core entities

| Model | Purpose |
|-------|---------|
| `RawEvent` | Ingest queue; `PENDING` → `PROCESSING` → `PROCESSED` / `FAILED`; dedupe via `deduplicationKey` |
| `Match` | One row per custom duel (`gameId` PK) |
| `Player` | Identity (`puuid`, `gameName`, `tagLine`) |
| `MatchPlayer` | Per-participant stats; unique `(gameId, teamId)` enforces 1v1 |

### 8.3 Data tier rules

- No component outside `server/` holds `DATABASE_URL`.
- Presentation and edge agent do not import database drivers or ORM clients.
- Schema changes are applied through Prisma migrations from the application tier.

---

## 9. Cross-tier contracts

### 9.1 Ingest API (edge agent → application)

| | |
|---|---|
| **Method / path** | `POST /api/events` |
| **Caller** | LCU client (`client/api.py`) |
| **Body** | JSON `MATCH_SNAPSHOT` with snake_case `match` + `players` (see §9.4) |
| **Success** | `202 Accepted` with `{ id, status }` — `status` is `PENDING` on queue |
| **Validation error** | `400 Bad Request` with `{ error, code }` |
| **Duplicate snapshot** | `409 Conflict` with `{ error, code: "DUPLICATE_SNAPSHOT", existingId? }` |
| **Semantics** | Fast ack; row lands in `raw_events`; match processing is async via worker |

**Duplicate front guard:** before insert, server derives `deduplicationKey` (`MATCH_SNAPSHOT:{game_id}` or client-supplied key), looks up `raw_events`, and **rejects** if already present. DB `UNIQUE` on `deduplication_key` is a race fallback (`P2002` → `409`).

**Not accepted:** `202` with `duplicate: true` — duplicates are rejected, not acknowledged.

See [API.md](API.md) for validation `code` values.

### 9.2 Read APIs (presentation → application)

Read APIs are **required** for strict 3-tier query flow. Exact paths are implementation-defined; suggested surface:

| Intent | Suggested path | Bot command |
|--------|----------------|-------------|
| All-time win/loss | `GET /api/stats` | `/stats` |
| Recent duels (last 5) | `GET /api/stats/recent` | `/stats recent` |
| Detailed record | `GET /api/stats/details` | `/stats details` |

*Read APIs are implemented for M3 (`REQ-BOT-01`–`REQ-BOT-04`). Identity is `puuid` query param; Telegram → puuid mapping lives in the bot config until `REQ-BOT-05`.*

### 9.3 Admin APIs (application tier internal / ops)

| Method / path | Purpose |
|---------------|---------|
| `GET /api/admin/raw-events/:id` | Inspect failed or stuck raw event |
| `POST /api/admin/raw-events/:id/replay` | Reset event to `PENDING` for reprocessing |

Protect with authentication in production (not yet specified in MVP).

### 9.4 MATCH_SNAPSHOT payload (logical shape)

```json
{
  "eventType": "MATCH_SNAPSHOT",
  "match": {
    "game_id": 1234567890,
    "game_duration": 1800,
    "game_creation_date": "2026-06-25T12:00:00.000Z"
  },
  "players": [
    {
      "participant_id": 1,
      "team_id": 100,
      "puuid": "...",
      "game_name": "PlayerOne",
      "tag_line": "NA1",
      "champion_id": 157,
      "first_blood": true,
      "first_tower": false,
      "total_cs": 120
    },
    {
      "participant_id": 2,
      "team_id": 200,
      "puuid": "...",
      "game_name": "PlayerTwo",
      "tag_line": "NA1",
      "champion_id": 266,
      "first_blood": false,
      "first_tower": false,
      "total_cs": 95
    }
  ]
}
```

**Ingest validation (REQ-SRV-01):** `eventType` must be `MATCH_SNAPSHOT`; `match` must include snake_case `game_id`, `game_duration`, `game_creation_date`; `players` must be an array of **exactly 2** entries. camelCase field names are not accepted at ingest today.

Deduplication key: `MATCH_SNAPSHOT:{match.game_id}` unless `deduplicationKey` is supplied explicitly.

---

## 10. Implementation status vs target

| Area | Target (this doc) | Current codebase |
|------|-------------------|------------------|
| 3-tier boundaries | Strict | Ingest path aligned; query path incomplete |
| Server HTTP layering | routes → controllers → services → models | Ingest/admin aligned; worker match writes partially bypass services |
| Read APIs for bot | P0 for query flow | Not implemented |
| Bot presentation-layered | handlers → services → API client | Flat stub in `bot.py` |
| LCU pipeline | orchestration → adapter → transform → transport | Largely in place |
| DB access isolation | Server only | Server only today |

Use this table when prioritizing work: **read APIs + bot layering** unblock the presentation tier; **worker → service reuse** tightens application-tier consistency.

---

## 11. Glossary

| Term | Meaning |
|------|---------|
| **3-tier architecture** | Presentation, application, and data tiers with enforced boundaries. |
| **Layered architecture** | Horizontal code layers inside one component (e.g. server). |
| **Presentation-layered** | Thin layered stack inside the Telegram bot; not a full application stack. |
| **Edge ingest agent** | LCU client; captures and sends; not user-facing UI. |
| **Layered monolith** | Single application deployable with internal layers (server). |
| **MATCH_SNAPSHOT** | Event type for end-of-game duel payload from LCU client. |
| **Raw event** | Ingested JSON stored before async processing into `Match` rows. |

---

## 12. Related documents

| Document | Scope |
|----------|--------|
| [PRD.md](../00-product/PRD.md) | Problem, vision, proposed solution |
| [User Stories](../00-product/UserStories.md) | Epics, use cases, prioritized requirements |
| [Roadmap](../00-product/Roadmap.md) | MVP definition, milestones, acceptance criteria |
| [server/docs/ARCHITECTURE.md](../../server/docs/ARCHITECTURE.md) | Server layer responsibilities and request lifecycle |

When product docs and this document differ on **architecture**, **this document is authoritative** for system and component structure.
