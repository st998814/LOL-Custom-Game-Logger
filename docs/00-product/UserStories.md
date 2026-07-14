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


| ID          | Task                | Description                                                                         |
| ----------- | ------------------- | ----------------------------------------------------------------------------------- |
| **UC-1-01** | Finish a custom 1v1 | Two friends complete a custom game (one player per side).                           |
| **UC-1-02** | Capture result      | System detects game end and records outcome via LCU-sourced data (no manual entry). |
| **UC-1-03** | Persist to ledger   | Result is stored in a durable database with match id, players, and timestamp.       |
| **UC-1-04** | Avoid duplicates    | Same game is not logged twice if capture runs more than once.                       |




### Use case 2 — Shared history and stats (US-2)


| ID          | Task                 | Description                                                                                      |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| **UC-2-01** | View personal record | Player checks all-time or recent win/loss vs. the group.                                         |
| **UC-2-02** | View match history   | Player browses past duels (who, when, outcome).                                                  |
| **UC-2-03** | Trust the record     | Results come from captured game data and agreed signing/validation rules, not handwritten notes. |
| **UC-2-04** | Query on demand      | Player uses a simple interface (e.g. chat commands) instead of opening a spreadsheet.            |


---



## Requirements



### Legend


| Tier   | Meaning                                              |
| ------ | ---------------------------------------------------- |
| **P0** | MVP — required for initial release to the duel group |
| **P1** | Important for a polished, trustworthy experience     |
| **P2** | Nice-to-have; defer until core loop is stable        |


**Requirement IDs** use a domain prefix plus a two-digit sequence:


| Prefix    | Section                   |
| --------- | ------------------------- |
| `UC-`*    | Use case tasks            |
| `REQ-CAP` | Duel capture (LCU client) |
| `REQ-SRV` | Ledger & server           |
| `REQ-BOT` | Telegram bot              |
| `REQ-TRU` | Credibility & signing     |
| `REQ-OPS` | Operations & quality      |


Reference requirements by ID in issues, PRs, and test matrices (e.g. `REQ-CAP-04`).

### Duel capture


| ID                   | Tier | Task                                                                          | User story | Note                                                                           |
| -------------------- | ---- | ----------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| **REQ-CAP-01(Done)** | P0   | Host duelist runs the LCU client on their PC while the League client is open. | US-1       | Only one duelist runs the tool per session; opponent does not need the client. |
| **REQ-CAP-02(Done)** | P0   | Client resolves LCU port and token from the running League process.           | US-1       | Fails with a clear message if League is not running.                           |
| **REQ-CAP-03(Done)** | P0   | Client detects game end and collects a match snapshot from LCU.               | US-1       | Triggered after a custom game finishes; no manual form entry.                  |
| **REQ-CAP-04(Done)** | P0   | Client validates the game is a **2-player** duel before sending.              | US-1       | Reject if `participantIdentities.length ≠ 2`.                                  |
| **REQ-CAP-05(Done)** | P0   | Client sends match snapshot to the server as a raw event.                     | US-1       | Includes `gameId`, duration, creation date, and per-player fields.             |
| **REQ-CAP-06**       | P1   | Client retries bootstrap and send on transient LCU/network errors.            | US-1       | Bounded retries; surface fatal errors in logs.                                 |
| **REQ-CAP-07**       | P1   | Client logs a confirmation when a duel is successfully submitted.             | US-1       | Helps host verify capture without opening Telegram.                            |
| **REQ-CAP-08**       | P2   | Client supports a dry-run mode that prints payload without sending.           | US-1       | Useful for debugging LCU parsing locally.                                      |




### Ledger & server


| ID                   | Tier | Task                                                                                                                            | User story | Note                                                                    |
| -------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| **REQ-SRV-01(Done)** | P0   | Server accepts raw events over HTTP and queues them for processing.                                                             | US-1       | Async ingestion; client does not block on DB writes.                    |
| **REQ-SRV-02(Done)** | P0   | Worker processes `MATCH_SNAPSHOT` events and persists to **PostgreSQL**.                                                        | US-1       | Prisma models: `Match`, `Player`, `MatchPlayer`, `RawEvent`.            |
| **REQ-SRV-03(Done)** | P0   | Server stores per-match fields: `gameId`, `gameDuration`, `gameCreationDate`.                                                   | US-1       | `gameId` is the primary key; duplicates are rejected.                   |
| **REQ-SRV-04(Done)** | P0   | Server stores per-player fields: `puuid`, `gameName`, `tagLine`, `championId`, `firstBlood`, `firstTower`, `totalCs`, `teamId`. | US-1       | Aligns with LCU snapshot schema; normalize empty/`0000…` puuid to null. |
| **REQ-SRV-05(Done)** | P0   | Server enforces **1v1 per match** (at most one row per `teamId` per game).                                                      | US-1       | DB unique constraint on `(gameId, teamId)`.                             |
| **REQ-SRV-06(Done)** | P0   | Server deduplicates ingest by `gameId` / deduplication key.                                                                     | US-1       | Same game must not create two ledger entries.                           |
| **REQ-SRV-07**       | P0   | Server derives and stores match **winner** from captured outcome data.                                                          | US-2       | Required for win/loss stats in Telegram.                                |
| **REQ-SRV-08**       | P1   | Server rejects snapshots that fail validation with a recorded error on the raw event.                                           | US-1       | Failed events remain inspectable; supports admin replay.                |
| **REQ-SRV-09**       | P1   | Admin can inspect and replay a failed raw event by id.                                                                          | US-1       | Recovery path for bad payloads without re-playing the game.             |
| **REQ-SRV-10**       | P2   | Server exposes read APIs optimized for bot queries (stats, history).                                                            | US-2       | Optional if bot queries Prisma/DB layer directly in v1.                 |




### Telegram bot (sole frontend)


| ID             | Tier | Task                                                                                  | User story | Note                                                                   |
| -------------- | ---- | ------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| **REQ-BOT-01** | P0   | Users can query **all-time win/loss** via `/stats`.                                   | US-2       | Default when no subcommand is given.                                   |
| **REQ-BOT-02** | P0   | Users can query **recent duels** (last 5) via `/stats recent`.                        | US-2       | Shows who played, when, and outcome.                                   |
| **REQ-BOT-03** | P0   | Users can query **all-time detailed record** via `/stats details`.                    | US-2       | Per-match or per-opponent breakdown as defined at implementation time. |
| **REQ-BOT-04** | P0   | Bot reads match data from the shared PostgreSQL ledger.                               | US-2       | Telegram is the only UI; no web or mobile app.                         |
| **REQ-BOT-05** | P1   | Bot resolves players by Riot ID (`gameName` + `tagLine`) or linked Telegram identity. | US-2       | Needed when multiple group members query personal stats.               |
| **REQ-BOT-06** | P1   | Bot shows champion **names** (not only numeric ids).                                  | US-2       | Requires a static champion id → name map.                              |
| **REQ-BOT-07** | P1   | Users can view **head-to-head** record vs. a named opponent.                          | US-2       | e.g. `/stats h2h @friend` or similar.                                  |
| **REQ-BOT-08** | P2   | Group receives a Telegram notification when a new duel is logged.                     | US-2       | Optional delight feature for the host's lobby.                         |
| **REQ-BOT-09** | P2   | Users can export duel history to CSV via a bot command.                               | US-2       | Backup and sharing outside Telegram.                                   |




### Credibility & signing


| ID             | Tier | Task                                                                         | User story | Note                                                                   |
| -------------- | ---- | ---------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| **REQ-TRU-01** | P0   | Ledger entries are sourced from LCU capture, not hand-entered forms.         | US-2       | Baseline trust without signing.                                        |
| **REQ-TRU-02** | P1   | Players can **sign** (attest to) a logged match result.                      | US-2       | In scope but **not top priority**; ships after core logging and stats. |
| **REQ-TRU-03** | P1   | Ledger shows whether a match is unsigned, partially signed, or fully signed. | US-2       | Both duelists attesting = fully signed.                                |
| **REQ-TRU-04** | P1   | Stats views indicate signed vs. unsigned matches where relevant.             | US-2       | Group agrees on whether unsigned matches count toward record.          |
| **REQ-TRU-05** | P2   | Disputed matches can be flagged for review without deleting ledger data.     | US-2       | Audit trail preserved.                                                 |




### Operations & quality


| ID             | Tier | Task                                                                      | User story | Note                                                 |
| -------------- | ---- | ------------------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| **REQ-OPS-01** | P0   | Stack runs on self-hosted server with PostgreSQL.                         | US-1, US-2 | No Riot Match-V5 API; no third-party match hosting.  |
| **REQ-OPS-02** | P0   | Raw-event worker retries failed processing up to a bounded limit.         | US-1       | Matches existing worker `MAX_RETRIES` behavior.      |
| **REQ-OPS-03** | P1   | Team can measure basic funnel: events received → processed → failed.      | US-1       | Via raw event status counts or simple admin queries. |
| **REQ-OPS-04** | P2   | Host can run client and bot on supported platforms with documented setup. | US-1       | README covers League + Python + server dependencies. |


