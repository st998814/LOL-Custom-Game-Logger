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
| **REQ-SRV-07(Done)** | P0   | Server derives and stores match **winner** from captured outcome data.                                                          | US-2       | House rule: FB **or** first tower **or** CS≥100; store at persist; fail if neither/ambiguous. See [DEC-001](../05-knowledge/Decisions.md#dec-001--custom-duel-win-judgement). |
| **REQ-SRV-08**       | P1   | Server rejects snapshots that fail validation with a recorded error on the raw event.                                           | US-1       | Failed events remain inspectable; supports admin replay.                |
| **REQ-SRV-09**       | P1   | Admin can inspect and replay a failed raw event by id.                                                                          | US-1       | Recovery path for bad payloads without re-playing the game.             |
| **REQ-SRV-10**       | P2   | Server exposes read APIs optimized for bot queries (stats, history).                                                            | US-2       | Optional if bot queries Prisma/DB layer directly in v1.                 |




### Telegram bot (sole frontend)


| ID             | Tier | Task                                                                                  | User story | Note                                                                                                                                 |
| -------------- | ---- | ------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **REQ-BOT-01(Done)** | P0   | Users can query **all-time win/loss** via `/stats`.                                   | US-2       | Default (no subcommand). Returns all-time **W–L counts** for the querying player in the group ledger. See [P0 stats contract](#p0-telegram-stats-contract). |
| **REQ-BOT-02(Done)** | P0   | Users can query **recent duels** (last 5) via `/stats recent`.                        | US-2       | Last **5** matches: opponents, timestamp, outcome (winner), champion ids; optional **win reason** (FB / first tower / CS≥100). See [P0 stats contract](#p0-telegram-stats-contract). |
| **REQ-BOT-03(Done)** | P0   | Users can query **all-time detailed record** via `/stats details`.                    | US-2       | Breakdown by **opponent** and/or per-match lines (who, when, champ ids, outcome, optional win reason). Named h2h command remains `REQ-BOT-07`. See [P0 stats contract](#p0-telegram-stats-contract). |
| **REQ-BOT-04(Done)** | P0   | Bot reads match data from the shared PostgreSQL ledger.                               | US-2       | Telegram is the only UI; no web or mobile app. Outcomes follow [DEC-001](../05-knowledge/Decisions.md#dec-001--custom-duel-win-judgement). |
| **REQ-BOT-05** | P1   | Bot resolves players by Riot ID (`gameName` + `tagLine`) or linked Telegram identity. | US-2       | Needed when multiple group members query personal stats.                                                                               |
| **REQ-BOT-06** | P1   | Bot shows champion **names** (not only numeric ids).                                  | US-2       | Requires a static champion id → name map. P0 may show numeric `championId`.                                                            |
| **REQ-BOT-07** | P1   | Users can view **head-to-head** record vs. a named opponent.                          | US-2       | e.g. `/stats h2h @friend` or similar.                                                                                                  |
| **REQ-BOT-08** | P2   | Group receives a Telegram notification when a new duel is logged.                     | US-2       | Optional delight feature for the host's lobby.                                                                                         |
| **REQ-BOT-09** | P2   | Users can export duel history to CSV via a bot command.                               | US-2       | Backup and sharing outside Telegram.                                                                                                   |


#### P0 Telegram stats contract

User-facing information each P0 command must be able to return. Outcome / W–L use the house win rule in [DEC-001](../05-knowledge/Decisions.md#dec-001--custom-duel-win-judgement) (not Riot nexus win).

| Command | Expect to see | Real-world use |
|---------|----------------|----------------|
| `/stats` | All-time **win count** and **loss count** for the player | After weeks of customs: “Am I 12–7 all-time?” Fast scoreboard without a spreadsheet. |
| `/stats recent` | Last **5** duels, each with **opponents**, **time** (`gameCreationDate`), **outcome** (who won), **champion ids** for both sides; **optional win reason** (first blood / first tower / CS≥100) | “Did we play last night?” / catch up after leaving: e.g. `PlayerOne vs PlayerTwo — PlayerTwo won · Mar 16`. |
| `/stats details` | All-time detail: **per-opponent** W–L and/or **per-match** history with the same field set as recent (opponents, time, champs, outcome, optional reason) | Rival banter (“I’m only bad vs you”) and champ context (“you only win on 82”) without requiring `REQ-BOT-07` yet. |

**Field notes (P0):**

- **Opponents** — Riot id (`gameName` + `tagLine`) of the other duelist(s) on that match.
- **Time** — match `gameCreationDate` (ordering for recent / “which Tuesday”).
- **Champs** — numeric `championId` in MVP; names deferred to `REQ-BOT-06`.
- **Win reason** — optional display of which house condition applied; evidence remains `firstBlood` / `firstTower` / `totalCs`.
- **Player resolution** (who “me” is) may stay simple until `REQ-BOT-05` (e.g. configured mapping); the **fields returned** above stay in scope for P0 command UX.

---


### Credibility & signing


| ID             | Tier | Task                                                                         | User story | Note                                                                   |
| -------------- | ---- | ---------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| **REQ-TRU-01(Done)** | P0   | Ledger entries are sourced from LCU capture, not hand-entered forms.         | US-2       | Baseline trust without signing.                                        |
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


