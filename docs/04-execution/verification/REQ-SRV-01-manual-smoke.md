# REQ-SRV-01 — Manual smoke verification

Server ingest: valid snapshot → `202`; duplicate snapshot → `409`; invalid body → `400`.

## Environment

| Field | Value |
|-------|-------|
| Date | 2026-07-09 |
| OS | macOS (darwin 25.3.0) |
| Requirement | [REQ-SRV-01](../../00-product/UserStories.md#ledger--server) |
| Issue | [#14](https://github.com/st998814/LOL-Custom-Game-Logger/issues/14) |
| Branch | `req-srv-01-accept-raw-events` |
| API | `http://127.0.0.1:7871` (`npm run dev` in `server/`) |
| Database | Supabase PostgreSQL (`server/.env` configured) |

## Prerequisites

1. `server/.env` has valid `DATABASE_URL` and `DIRECT_URL`
2. `cd server && npx prisma migrate deploy` applied
3. API running: `npm run dev`

## Steps

1. Build a valid payload from the test fixture with a **fresh** `match.game_id` (example below uses `981234567`).
2. `POST /api/events` once — expect `202` and `status: PENDING`.
3. Repeat the **same** payload — expect `409` `DUPLICATE_SNAPSHOT` and no second row for that dedup key.
4. `POST {}` — expect `400` `INVALID_EVENT_TYPE`.

### Commands

```bash
cd server
GAME_ID=981234567
PAYLOAD=$(node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('tests/fixtures/match-snapshot.json','utf8'));
p.match.game_id=Number(process.env.GAME_ID);
console.log(JSON.stringify(p));
")

curl -s -X POST http://127.0.0.1:7871/api/events \
  -H 'Content-Type: application/json' -d "$PAYLOAD"

curl -s -X POST http://127.0.0.1:7871/api/events \
  -H 'Content-Type: application/json' -d "$PAYLOAD"

curl -s -X POST http://127.0.0.1:7871/api/events \
  -H 'Content-Type: application/json' -d '{}'
```

## Result

**Pass** — First ingest queued with `202`; duplicate rejected with `409`; invalid payload rejected with `400`.

## Redacted response excerpt

```json
// First POST — HTTP 202
{"id":"3","status":"PENDING"}

// Second POST (same game_id) — HTTP 409
{"error":"A snapshot for this game has already been ingested","code":"DUPLICATE_SNAPSHOT","existingId":"3"}

// Invalid POST — HTTP 400
{"error":"eventType must be MATCH_SNAPSHOT","code":"INVALID_EVENT_TYPE"}
```

## Acceptance criteria mapping

| Criterion | Status |
|-----------|--------|
| Valid `MATCH_SNAPSHOT` → `202` + `PENDING` row | Pass |
| Duplicate ingest → `409 DUPLICATE_SNAPSHOT`, one row | Pass |
| Invalid shape → `400` with `code` | Pass |
| No `duplicate` field on success response | Pass |

## Notes

- Automated live-DB coverage also runs via `cd server && npm run test:integration`.
- Client duplicate-resend idempotency (`409` → `READY`) is **out of scope** for this issue; file a follow-up after server merge.
- Worker processing (`PROCESSED` / `matches` row) is REQ-SRV-02.
