# LoL Custom Duel Ledger — User Stories & Requirements

**Steven** — Jun 22, 2026

User-facing requirements for the duel ledger. Strategic context lives in [PRD](./PRD.md); release sequencing and MVP gates live in [Roadmap](./Roadmap.md).

---

## Epics

| ID       | User story                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **US-1** | As a player who enjoys 1-on-1 custom duels with friends, I want match results logged and persisted automatically so I don't have to maintain records by hand. |
| **US-2** | As a member of a duel group, I want a shared, trustworthy history of our matches so we can settle scores and track performance over time.                     |

---

## Use cases

### Use case 1 — Automatic duel logging (US-1)

| Task                | Description                                                                         |
| ------------------- | ----------------------------------------------------------------------------------- |
| Finish a custom 1v1 | Two friends complete a custom game (one player per side).                           |
| Capture result      | System detects game end and records outcome via LCU-sourced data (no manual entry). |
| Persist to ledger   | Result is stored in a durable database with match id, players, and timestamp.       |
| Avoid duplicates    | Same game is not logged twice if capture runs more than once.                       |

### Use case 2 — Shared history and stats (US-2)

| Task                 | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| View personal record | Player checks all-time or recent win/loss vs. the group.                                         |
| View match history   | Player browses past duels (who, when, outcome).                                                  |
| Trust the record     | Results come from captured game data and agreed signing/validation rules, not handwritten notes. |
| Query on demand      | Player uses a simple interface (e.g. chat commands) instead of opening a spreadsheet.            |

---

## Requirements

### Legend

| Tier   | Meaning                                              |
| ------ | ---------------------------------------------------- |
| **P0** | MVP — required for initial release to the duel group |
| **P1** | Important for a polished, trustworthy experience     |
| **P2** | Nice-to-have; defer until core loop is stable        |

### Duel capture

| Tier | Task                                                                          | User story | Note                                                                           |
| ---- | ----------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| P0   | Host duelist runs the LCU client on their PC while the League client is open. | US-1       | Only one duelist runs the tool per session; opponent does not need the client. |
| P0   | Client resolves LCU port and token from the running League process.           | US-1       | Fails with a clear message if League is not running.                           |
| P0   | Client detects game end and collects a match snapshot from LCU.               | US-1       | Triggered after a custom game finishes; no manual form entry.                  |
| P0   | Client validates the game is a **2-player** duel before sending.              | US-1       | Reject if `participantIdentities.length ≠ 2`.                                  |
| P0   | Client sends match snapshot to the server as a raw event.                     | US-1       | Includes `gameId`, duration, creation date, and per-player fields.             |
| P1   | Client retries bootstrap and send on transient LCU/network errors.            | US-1       | Bounded retries; surface fatal errors in logs.                                 |
| P1   | Client logs a confirmation when a duel is successfully submitted.             | US-1       | Helps host verify capture without opening Telegram.                            |
| P2   | Client supports a dry-run mode that prints payload without sending.           | US-1       | Useful for debugging LCU parsing locally.                                      |

### Ledger & server

| Tier | Task                                                                                                                            | User story | Note                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| P0   | Server accepts raw events over HTTP and queues them for processing.                                                             | US-1       | Async ingestion; client does not block on DB writes.                    |
| P0   | Worker processes `MATCH_SNAPSHOT` events and persists to **PostgreSQL**.                                                        | US-1       | Prisma models: `Match`, `Player`, `MatchPlayer`, `RawEvent`.            |
| P0   | Server stores per-match fields: `gameId`, `gameDuration`, `gameCreationDate`.                                                   | US-1       | `gameId` is the primary key; duplicates are rejected.                   |
| P0   | Server stores per-player fields: `puuid`, `gameName`, `tagLine`, `championId`, `firstBlood`, `firstTower`, `totalCs`, `teamId`. | US-1       | Aligns with LCU snapshot schema; normalize empty/`0000…` puuid to null. |
| P0   | Server enforces **1v1 per match** (at most one row per `teamId` per game).                                                      | US-1       | DB unique constraint on `(gameId, teamId)`.                             |
| P0   | Server deduplicates ingest by `gameId` / deduplication key.                                                                     | US-1       | Same game must not create two ledger entries.                           |
| P0   | Server derives and stores match **winner** from captured outcome data.                                                          | US-2       | Required for win/loss stats in Telegram.                                |
| P1   | Server rejects snapshots that fail validation with a recorded error on the raw event.                                           | US-1       | Failed events remain inspectable; supports admin replay.                |
| P1   | Admin can inspect and replay a failed raw event by id.                                                                          | US-1       | Recovery path for bad payloads without re-playing the game.             |
| P2   | Server exposes read APIs optimized for bot queries (stats, history).                                                            | US-2       | Optional if bot queries Prisma/DB layer directly in v1.                 |

### Telegram bot (sole frontend)

| Tier | Task                                                                                  | User story | Note                                                                   |
| ---- | ------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| P0   | Users can query **all-time win/loss** via `/stats`.                                   | US-2       | Default when no subcommand is given.                                   |
| P0   | Users can query **recent duels** (last 5) via `/stats recent`.                        | US-2       | Shows who played, when, and outcome.                                   |
| P0   | Users can query **all-time detailed record** via `/stats details`.                    | US-2       | Per-match or per-opponent breakdown as defined at implementation time. |
| P0   | Bot reads match data from the shared PostgreSQL ledger.                               | US-2       | Telegram is the only UI; no web or mobile app.                         |
| P1   | Bot resolves players by Riot ID (`gameName` + `tagLine`) or linked Telegram identity. | US-2       | Needed when multiple group members query personal stats.               |
| P1   | Bot shows champion **names** (not only numeric ids).                                  | US-2       | Requires a static champion id → name map.                              |
| P1   | Users can view **head-to-head** record vs. a named opponent.                          | US-2       | e.g. `/stats h2h @friend` or similar.                                  |
| P2   | Group receives a Telegram notification when a new duel is logged.                     | US-2       | Optional delight feature for the host's lobby.                         |
| P2   | Users can export duel history to CSV via a bot command.                               | US-2       | Backup and sharing outside Telegram.                                   |

### Credibility & signing

| Tier | Task                                                                         | User story | Note                                                                   |
| ---- | ---------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| P0   | Ledger entries are sourced from LCU capture, not hand-entered forms.         | US-2       | Baseline trust without signing.                                        |
| P1   | Players can **sign** (attest to) a logged match result.                      | US-2       | In scope but **not top priority**; ships after core logging and stats. |
| P1   | Ledger shows whether a match is unsigned, partially signed, or fully signed. | US-2       | Both duelists attesting = fully signed.                                |
| P1   | Stats views indicate signed vs. unsigned matches where relevant.             | US-2       | Group agrees on whether unsigned matches count toward record.          |
| P2   | Disputed matches can be flagged for review without deleting ledger data.     | US-2       | Audit trail preserved.                                                 |

### Operations & quality

| Tier | Task                                                                      | User story | Note                                                 |
| ---- | ------------------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| P0   | Stack runs on self-hosted server with PostgreSQL.                         | US-1, US-2 | No Riot Match-V5 API; no third-party match hosting.  |
| P0   | Raw-event worker retries failed processing up to a bounded limit.         | US-1       | Matches existing worker `MAX_RETRIES` behavior.      |
| P1   | Team can measure basic funnel: events received → processed → failed.      | US-1       | Via raw event status counts or simple admin queries. |
| P2   | Host can run client and bot on supported platforms with documented setup. | US-1       | README covers League + Python + server dependencies. |
