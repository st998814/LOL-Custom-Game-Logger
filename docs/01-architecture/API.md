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

## Read APIs (planned)

Not yet implemented. Suggested surface in [SystemArchitecture.md](SystemArchitecture.md) §9.2.

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
