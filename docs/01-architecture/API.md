# API — Application tier HTTP contracts

Cross-tier HTTP surfaces for the LoL Custom Duel Ledger. Architecture context: [SystemArchitecture.md](SystemArchitecture.md) §9.

*Unofficial fan tool — not affiliated with or endorsed by Riot Games.*

---

## Trust constraint (REQ-TRU-01)

Ledger entries are **sourced from LCU capture**, not hand-entered forms. Baseline trust without player signing (`REQ-TRU-02+`).

| Allowed write path | Not allowed |
|--------------------|-------------|
| LCU client → `POST /api/events` (`MATCH_SNAPSHOT`) → worker → PostgreSQL | Hand-entry forms or UI that create matches |
| Admin raw-event inspect / replay of already-captured events | Direct HTTP “create match” endpoints (e.g. legacy `POST /api/data`) |

Telegram is read-only. Cryptographic proof of LCU origin is out of scope for MVP.

---

## Ingest — `POST /api/events`

**Caller:** LCU edge agent (`client/api.py`)  
**Purpose:** Queue a `MATCH_SNAPSHOT` raw event for async processing (REQ-SRV-01).

### Request

| | |
|---|---|
| **URL** | `http://<host>:7871/api/events` (local default) |
| **Method** | `POST` |
| **Headers** | `Content-Type: application/json` |
| **Body** | `MATCH_SNAPSHOT` JSON (snake_case) — see [§MATCH_SNAPSHOT body](#match_snapshot-body) |

### Responses

| Status | When | Body |
|--------|------|------|
| `202` | New valid snapshot queued | `{ "id": "<raw_event_id>", "status": "PENDING" }` |
| `400` | Validation failed | `{ "error": "<message>", "code": "<CODE>" }` |
| `409` | Duplicate snapshot (same dedup key) | `{ "error": "<message>", "code": "DUPLICATE_SNAPSHOT", "existingId": "<id>"? }` |

Success responses do **not** include a `duplicate` field.

### Validation rules

| Rule | Error `code` |
|------|----------------|
| Body must be a JSON object | `INVALID_PAYLOAD` |
| `eventType` must be `MATCH_SNAPSHOT` | `INVALID_EVENT_TYPE` |
| `match` must be an object | `INVALID_MATCH` |
| `match.game_id` required (number) | `MISSING_GAME_ID` |
| `match.game_duration` required (number) | `MISSING_GAME_DURATION` |
| `match.game_creation_date` required (non-empty string) | `MISSING_GAME_CREATION_DATE` |
| `players` must be an array | `INVALID_PLAYERS` |
| `players.length` must be `2` | `INVALID_PLAYERS_COUNT` |
| Unexpected persistence failure | `INGEST_FAILED` |

### Duplicate guard

1. Server derives `deduplicationKey`:
   - Client-supplied `deduplicationKey`, or
   - `MATCH_SNAPSHOT:{match.game_id}`
2. `findByDeduplicationKey` — if row exists → `409 DUPLICATE_SNAPSHOT`
3. Else `INSERT` into `raw_events` with `status = PENDING`
4. Concurrent duplicate insert (`P2002`) → `409 DUPLICATE_SNAPSHOT`

Worker processing of queued events is REQ-SRV-02 (out of scope for ingest contract).

### MATCH_SNAPSHOT body

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

Fixture: [`server/tests/fixtures/match-snapshot.json`](../../server/tests/fixtures/match-snapshot.json)

### Example — success then duplicate

```bash
# First POST → 202
curl -s -X POST http://127.0.0.1:7871/api/events \
  -H 'Content-Type: application/json' \
  -d @server/tests/fixtures/match-snapshot.json

# Same game_id again → 409
curl -s -X POST http://127.0.0.1:7871/api/events \
  -H 'Content-Type: application/json' \
  -d @server/tests/fixtures/match-snapshot.json
```

---

## Read APIs (presentation → application)

**Callers:** Telegram bot (`frontend/bot/`)  
**Purpose:** All-time / recent / detailed duel stats for the linked chat user.  
**Identity:** [DEC-002](../05-knowledge/Decisions.md#dec-002--stats-query-identity-is-telegram-tgid) — query by **`tgId`** (Telegram user id). The server resolves the linked `players` row; the bot does not send or map `puuid`.

| Method / path | Requirement |
|---------------|-------------|
| `GET /api/stats?tgId=<telegram_user_id>` | REQ-BOT-01 / REQ-BOT-04 |
| `GET /api/stats/recent?tgId=<telegram_user_id>` | REQ-BOT-02 |
| `GET /api/stats/details?tgId=<telegram_user_id>` | REQ-BOT-03 |

| Status | When | Body (shape) |
|--------|------|----------------|
| `200` | Linked player found | All-time: `{ wins, losses, gameName?, tagLine?, … }`; recent/details: match / by-opponent payloads as implemented |
| `400` | Missing or invalid `tgId` | `{ "error": "…" }` |
| `404` | No linked player for this `tgId` | `{ "error": "…" }` (bot should prompt link / `/start`) |

- `tgId` is a positive integer (JSON/query); stored as `BIGINT` on `players.tg_id`.
- Known player with no matches → `200` with zeros / empty lists (same semantics as today’s puuid-based handlers).
- **Migration note:** the server currently still accepts `?puuid=` for these paths. Treat that as transitional; new bot code and docs use `tgId` only. Remove or deprecate `puuid` once the bot path is wired.

See also [SystemArchitecture.md](SystemArchitecture.md) §9.2.

---

## User account (REQ-BOT-05)

**Callers:** LCU edge agent (`capture_agent/account/api.py`) for status and link requests; Telegram bot (`frontend/bot/actions/user.py`) for link completion  
**Purpose:** Identify the host by PUUID and link their Telegram account. The PUUID is the only credential; no sessions. Requirements: REQ-ACC-01..03 in [UserStories.md](../00-product/UserStories.md).

| Method / path | Caller | Requirement |
|---------------|--------|-------------|
| `GET /api/user/status?puuid=<puuid>` | Agent | REQ-ACC-01 |
| `POST /api/user/link` | Agent | REQ-ACC-02 |
| `POST /api/user/link/complete` | Bot | REQ-ACC-03 |
| `POST /api/user/register/link` | — | **Deprecated** alias of `/link` |
| `POST /api/user/register/link/complete` | — | **Deprecated** alias of `/link/complete` |

The deprecated aliases keep older agents and bots working; new clients use the paths without `register/`.

### Errors

Every failure returns `{ "error": "<message>", "code": "<CODE>" }`.

| Status | `code` | When |
|--------|--------|------|
| `400` | `INVALID_INPUT` | Missing or blank `puuid` / `token`, or `tgId` is not a positive integer |
| `404` | `NOT_REGISTERED` | Completion: no `players` row for the PUUID yet (the token is kept) |
| `409` | `ALREADY_LINKED` | Link request or completion: the PUUID already has a `tg_id` |
| `409` | `TG_ALREADY_LINKED` | Completion: this Telegram id is already bound to another PUUID |
| `410` | `LINK_EXPIRED` | Completion: the token is unknown, expired or already used |
| `500` | `INTERNAL` | Unexpected server failure (database or Redis) |

### `GET /api/user/status`

| Status | When | Body |
|--------|------|------|
| `200` | Well-formed request | `{ "registered": bool, "linked": bool }` |
| `400` | `puuid` missing | `INVALID_INPUT` |

- `registered` — a `players` row exists for this PUUID.
- `linked` — that row has a `tg_id`.

The agent maps the answer to an account status:

| `registered` | `linked` | Agent status | Agent behavior after bootstrap |
|--------------|----------|--------------|--------------------------------|
| `false` | — | `NEW` | Log a welcome message |
| `true` | `false` | `UNLINKED` | Request a link and show it as a QR code |
| `true` | `true` | `LINKED` | Nothing |
| unreachable / bad payload | | `UNKNOWN` | Log a warning; re-check after the next game reaches the server |

### `POST /api/user/link`

**Body:** `{ "puuid": "<puuid>" }`

| Status | When | Body |
|--------|------|------|
| `200` | Link issued, or the still-valid one reused | `{ "status": "pending", "link": "https://t.me/<bot>?start=<token>", "expiresIn": <seconds> }` |
| `409` | PUUID already has a `tg_id` | `ALREADY_LINKED` |
| `400` | `puuid` missing | `INVALID_INPUT` |

- Issuing does **not** require a registered PUUID, so a new host can get a link before the worker has processed their first game.
- Tokens live in Redis for 600 seconds: `telegram_link:<token>` → PUUID, plus a reverse key `telegram_link:puuid:<puuid>` → token. Repeated requests for the same PUUID return the same link with the remaining `expiresIn`; concurrent requests settle on one token.
- `<bot>` is `TELEGRAM_BOT_USERNAME` (server env), defaulting to `Dev962299Bot`.

The agent treats `409` as "already linked" and shows nothing; any other failure is logged and capture continues.

### `POST /api/user/link/complete`

**Caller:** Telegram bot, when the user opens the link (`/start <token>`).  
**Body:** `{ "token": "<token>", "tgId": <telegram user id> }`

| Status | When | Body |
|--------|------|------|
| `200` | Telegram id bound to the PUUID | `{ "puuid": "<puuid>", "tgId": <id>, "gameName": "<name>" \| null }` |
| `404` | Worker has not written the `players` row yet | `NOT_REGISTERED` |
| `409` | PUUID already linked / Telegram id used elsewhere | `ALREADY_LINKED` / `TG_ALREADY_LINKED` |
| `410` | Token unknown, expired or already used | `LINK_EXPIRED` |
| `400` | Bad `token` or `tgId` | `INVALID_INPUT` |

- Registration is enforced here only. On `NOT_REGISTERED` the token stays valid, so the user can open the same link again once the first game is processed.
- On success both Redis keys are deleted, so a link works once.
- `token` is the bare token from the link. The legacy form `telegram_link:<token>` is still accepted.
- `tgId` is a JSON number; it is stored as `BIGINT` because Telegram ids exceed 32 bits.

The bot maps each `code` to a user-facing reply; `INTERNAL` falls through to its generic error message.

### When the agent requests a link

- After bootstrap (startup and every reconnect) when the status is `UNLINKED`.
- When a `NEW` host's first game reaches the server (ingest `202`/`409`, or a non-empty pending flush): the agent logs "Your first game was received" and requests a link once.

---

## Admin APIs

| Method / path | Purpose |
|---------------|---------|
| `GET /api/admin/raw-events/:id` | Inspect raw event by id |
| `POST /api/admin/raw-events/:id/replay` | Reset event to `PENDING` |

Authentication not specified for MVP.

---

## Client coupling notes

- **REQ-CAP-05:** client sends valid snake_case snapshots; first POST per game receives `202`.
- **Follow-up required:** `client/api.py` treats any `status >= 400` as fatal. Accidental resend of the same game receives `409` until a client follow-up treats `DUPLICATE_SNAPSHOT` as idempotent success.

---

## Related docs

- [SystemArchitecture.md](SystemArchitecture.md) §9
- [Database.md](Database.md)
- [server/README.md](../../server/README.md)
