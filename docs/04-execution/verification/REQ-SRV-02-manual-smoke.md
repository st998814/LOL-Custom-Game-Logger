# REQ-SRV-02 — Manual smoke verification

Worker persistence: seed `PENDING` raw event → process batch → ledger rows + `PROCESSED`.

## Environment

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| OS | macOS (darwin 25.3.0) |
| Requirement | [REQ-SRV-02](../../00-product/UserStories.md#ledger--server) |
| Issue | [#17](https://github.com/st998814/LOL-Custom-Game-Logger/issues/17) |
| Branch | `req-srv-02-worker-persistence` |
| Database | Supabase PostgreSQL (`server/.env` configured) |

## Prerequisites

1. `server/.env` has valid `DATABASE_URL` and `DIRECT_URL`
2. `cd server && npx prisma migrate deploy` applied
3. Prisma client generated: `npx prisma generate`

## Steps

1. Seed a `PENDING` `raw_events` row with a `MATCH_SNAPSHOT` payload (unique `game_id`).
2. Run one worker batch (`processBatch`) — same code path as `npm run worker`, without the infinite poll loop.
3. Confirm:
   - `raw_events.status = PROCESSED` and `processed_at` is set
   - One `matches` row for the `game_id`
   - Two `match_players` rows with expected player stats
4. Clean up test rows (script does this automatically).

### Command (reproducible helper)

```bash
cd server
npx tsx tests/manual/worker-smoke-once.ts
```

### Alternative (long-running worker)

1. Insert a `PENDING` row (SQL or Prisma Studio) with payload from `tests/fixtures/match-snapshot.json` and a fresh `game_id`.
2. In a second terminal: `npm run worker`
3. Within ~2s poll interval, inspect `raw_events`, `matches`, `match_players` in Prisma Studio.

## Result

**Pass** — Seeded `PENDING` event processed to `PROCESSED`; match and two match-player rows persisted with correct core fields.

## Redacted response excerpt

```json
{
  "gameId": 972017137,
  "rawEventId": "7",
  "rawEventStatus": "PROCESSED",
  "processedAt": "2026-07-10T10:25:47.807Z",
  "match": {
    "gameId": 972017137,
    "gameDuration": 628,
    "gameCreationDate": "2026-03-16T12:32:09.240Z"
  },
  "matchPlayerCount": 2,
  "players": [
    {
      "participantId": 1,
      "teamId": 100,
      "championId": 54,
      "puuid": "47842bcd-35c8-5a94-b368-2d4aa6867e95",
      "gameName": "PlayerOne",
      "tagLine": "5715"
    },
    {
      "participantId": 2,
      "teamId": 200,
      "championId": 82,
      "puuid": "333b88e5-36d7-558e-9084-b5afd88a5776",
      "gameName": "PlayerTwo",
      "tagLine": "yugi"
    }
  ]
}
```

## Acceptance criteria mapping

| Criterion | Status |
|-----------|--------|
| Queued `MATCH_SNAPSHOT` processed by worker | Pass |
| `Match` row persisted with core fields | Pass |
| Two `MatchPlayer` rows with player stats | Pass |
| `RawEvent` → `PROCESSED` | Pass |

## Notes

- Automated live-DB coverage also runs via `cd server && npm run test:integration` (`matchSnapshot.integration.test.ts`).
- Full HTTP ingest → worker path is covered indirectly (REQ-SRV-01 queues; this issue proves worker persistence).
- Winner derivation (`REQ-SRV-07`) and null-`puuid` identity remain deferred.
