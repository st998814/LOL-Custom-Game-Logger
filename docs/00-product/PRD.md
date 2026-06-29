# LoL Custom Duel Ledger

**Steven** — Jun 22, 2026

*As a player who enjoys 1-on-1 custom duels with friends, I want match results logged and persisted automatically so I don't have to maintain records by hand.*

*As a member of a duel group, I want a shared, trustworthy history of our matches so we can settle scores and track performance over time.*

---

## Problem

Players who regularly run **custom 1-on-1 duels** with friends have no purpose-built way to record and keep those results. Today, the default is **manual logging** — writing outcomes into a notebook, a spreadsheet, or a generic document after each game.

That approach breaks down quickly:

- **It's tedious.** After a duel, someone has to remember to log the winner, date, and any details — easy to skip when you're queueing again.
- **It's unreliable.** Hand-entered records get typos, omissions, or conflicting versions when two players remember the outcome differently.
- **It's hard to use.** Paper and ad-hoc files don't support quick lookups like "all-time record vs. Alex" or "last five duels" without manual sorting and formulas.
- **Official tools don't cover this.** Riot's match history focuses on supported queue types; **custom friend duels** sit outside that, so there is no authoritative shared ledger for a private duel group.
- **Trust is informal.** Without a consistent, verifiable record, long-running rivalries depend on memory and screenshots rather than a single source of truth.

For duel-focused friend groups, the gap is clear: they want a **persistent duel history**, but the only options today are **manual, fragmented, and dispute-prone**.

### Vision & Opportunity

**Vision:** A simple, automatic **ledger** for custom LoL 1v1 duels — capture results when a game ends, store them in one place, and let the group view stats and history without spreadsheets or arguments.

**Opportunity:**

- **Underserved niche.** Custom duels are a common social format among friends, but no mainstream product targets "our private 1v1 ledger" specifically.
- **Automation is feasible.** Match metadata is available locally via the **League Client (LCU)** at game end, so logging doesn't have to be manual.
- **Credibility as differentiator.** A signed, transparent record (who played, who won, when) turns informal duels into a **trusted shared history** — aligned with the product's credibility and transparency goals.
- **Lightweight delivery.** A small group tool (e.g. Telegram for queries, a local client for capture, a central store for persistence) can ship an MVP without Riot API integration or ranked-scale infrastructure.
- **Room to grow.** The same model can extend to richer stats, head-to-head views, and group features once core logging is solid.

*Unofficial fan tool — not affiliated with or endorsed by Riot Games.*

### Target Use Cases & Tasks

**Use case 1 — Automatic duel logging**

*As a player who enjoys 1-on-1 custom duels with friends, I want match results logged and persisted automatically so I don't have to maintain records by hand.*


| Task                | Description                                                                         |
| ------------------- | ----------------------------------------------------------------------------------- |
| Finish a custom 1v1 | Two friends complete a custom game (one player per side).                           |
| Capture result      | System detects game end and records outcome via LCU-sourced data (no manual entry). |
| Persist to ledger   | Result is stored in a durable database with match id, players, and timestamp.       |
| Avoid duplicates    | Same game is not logged twice if capture runs more than once.                       |


**Use case 2 — Shared history and stats**

*As a member of a duel group, I want a shared, trustworthy history of our matches so we can settle scores and track performance over time.*


| Task                 | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| View personal record | Player checks all-time or recent win/loss vs. the group.                                         |
| View match history   | Player browses past duels (who, when, outcome).                                                  |
| Trust the record     | Results come from captured game data and agreed signing/validation rules, not handwritten notes. |
| Query on demand      | Player uses a simple interface (e.g. chat commands) instead of opening a spreadsheet.            |


---

## Proposed Solution

Offer a simple, no-frills **ledger for custom LoL 1v1 duels**. When a duel ends, a local client running on **one duelist's machine** captures match data from the League Client (LCU), sends it to a central server, and stores it as a durable record. All players query win/loss and history through a **Telegram bot** — the sole frontend — with no spreadsheets, no manual entry, and no Riot API dependency.

Designed for a **small friend group** running custom one-on-one games. Free to run for the group; infrastructure stays minimal (self-hosted server + PostgreSQL).

### Top 3 MVP value props

1. **Automatic duel capture from LCU** *(the vitamin)*
  Match results are recorded when the game ends, sourced from local client data — not typed in by hand after the fact.
2. **A shared, credible duel ledger** *(the painkiller)*
  One canonical record per game (players, outcome, timestamp) with server-side validation so disputes don't devolve into conflicting handwritten notes.
3. **Stats on demand in Telegram** *(the steroid)*
  Check all-time or recent record vs. friends via simple bot commands instead of opening Excel.

**Signing** (match attestation by players) is **in scope** but **not top priority** — core logging and stats ship first; signing strengthens trust in a later milestone.

### How it works (high level)

```
[Host duelist's PC]              [Server]                    [All players]
 LC Client  ──LCU──►  capture   ──HTTP──►  PostgreSQL
 (Python)     game      │           (ledger)
                        └── raw events ──► processed matches
                                                    Telegram bot ◄── queries
```


| Component                     | Role                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LCU client** (Python)       | Runs on **one designated duelist's PC** while League is open; reads match metadata after a custom 1v1 ends; validates it is a 2-player duel; sends payload to server. |
| **Server** (Express + Prisma) | Ingests events, deduplicates by game id, persists matches and players to **PostgreSQL**.                                                                              |
| **Telegram bot** (Python)     | **Only frontend** — view stats and match history (e.g. all-time record, recent games).                                                                                |
| **PostgreSQL**                | Long-term storage for matches, players, and raw event queue.                                                                                                          |


### End-to-end flow

1. Two players finish a **custom 1v1** (one player per team).
2. The **host duelist** (the one running the LCU client) detects game end and collects match snapshot data.
3. Client sends data to the **server** as a raw event.
4. Server **validates** (2 participants, custom game, not duplicate `gameId`) and writes to the **ledger**.
5. Any group member can **query** results via the Telegram bot.

### What we deliberately do *not* build (MVP)

- **No Riot Match-V5 API** — all data comes from LCU at game end, not live polling of Riot servers.
- **No full match analytics** — MVP focuses on outcome and core stats (win/loss, duration, champions), not deep post-game breakdowns.
- **No ranked / team modes** — scope is **custom 1v1 duels** only.
- **No web or mobile app** — Telegram is the only user interface.
- **No per-player LCU client requirement** — only one duelist runs the capture tool per session.

### Monetization & distribution (initial)

- **Audience:** Private duel group (friends); not a public app-store product for MVP.
- **Cost model:** Self-hosted server; no subscription tier in v1.
- **Distribution:** The host duelist runs the LCU client; all members join the Telegram bot to view stats.

---

## Requirements

### Legend


| Tier   | Meaning                                              |
| ------ | ---------------------------------------------------- |
| **P0** | MVP — required for initial release to the duel group |
| **P1** | Important for a polished, trustworthy experience     |
| **P2** | Nice-to-have; defer until core loop is stable        |


### User story reference


| ID       | User story                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **US-1** | As a player who enjoys 1-on-1 custom duels with friends, I want match results logged and persisted automatically so I don't have to maintain records by hand. |
| **US-2** | As a member of a duel group, I want a shared, trustworthy history of our matches so we can settle scores and track performance over time.                     |


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


---

## MVP Definition

The **MVP** (minimum viable product) is the smallest release that lets the duel group **stop using spreadsheets or paper** for custom 1v1 results. MVP ships when every **P0** requirement is satisfied and the group can complete the full loop below without manual data entry.

### Goals

- Make it automatic to log custom 1v1 duel results after each game ends.
- Give the group one shared, queryable ledger instead of fragmented notes.
- Let any member check win/loss and recent history via Telegram in seconds.
- Replace manual record-keeping for day-to-day duels within the friend group.

### Non-goals (MVP)

- Player **signing** / match attestation (P1 — post-MVP milestone).
- Head-to-head commands, champion name display, CSV export, or group notifications.
- Riot Match-V5 API integration, ranked queues, or team/customs larger than 1v1.
- Web app, mobile app, or any frontend other than Telegram.
- Public launch, app-store distribution, or monetization.
- Deep post-game analytics (damage, items, timelines, etc.).

### MVP scope

MVP includes **all P0 rows** in [Requirements](#requirements) across:

- Duel capture (LCU client on host machine)
- Ledger & server (PostgreSQL, validation, dedupe, winner)
- Telegram bot (`/stats`, `/stats recent`, `/stats details`)
- Operations (self-hosted stack, raw-event retries)

### Core user loop (must work end-to-end)

```
Custom 1v1 ends → host client captures via LCU → server writes ledger → any player queries /stats in Telegram
```

### Implementation milestones


| Milestone                   | Outcome                                                                          | P0 requirements covered                                                |
| --------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **M1 — Capture path**       | Host finishes a duel; snapshot reaches server and lands in PostgreSQL.           | LCU client P0 rows; server ingest + worker P0 (except winner if split) |
| **M2 — Ledger correctness** | Each game is one row; 2-player only; duplicates rejected; winner stored.         | Validation, dedupe, 1v1 constraint, winner derivation                  |
| **M3 — Read path**          | Telegram returns correct all-time, recent, and detailed stats from the ledger.   | All Telegram bot P0 rows                                               |
| **M4 — Dogfood**            | Duel group uses MVP for real customs without maintaining a parallel spreadsheet. | Operational validation                                                 |


Work milestones **in order** (M1 → M2 → M3 → M4). Do not start P1 work until M4 is complete or explicitly deferred.

### Definition of Done (per P0 requirement)

A P0 requirement is **done** when:

1. **Implemented** in the codebase and deployed to the group's environment.
2. **Verified** against acceptance criteria (manual test or automated check).
3. **Traceable** to the PRD row (issue/PR references the task text or ID).

### MVP acceptance test (vertical slice)

The MVP is **shipped** when this scenario passes:

1. Two players complete a **custom 1v1** with the **host** running the LCU client.
2. Within a reasonable window after game end, exactly **one** match appears in PostgreSQL with correct `gameId`, players, duration, and **winner**.
3. Submitting the same snapshot again does **not** create a duplicate entry.
4. A non-host player runs `/stats` and sees the correct **all-time win/loss**.
5. `/stats recent` lists the duel among the last five games with correct outcome.
6. `/stats details` shows a consistent per-match or per-player breakdown.
7. The group agrees they can **stop updating** their manual spreadsheet for new duels.

### Success metrics (duel group)


| Metric              | Target                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| Manual logging      | **0** new duels recorded in spreadsheet/paper after MVP adoption                     |
| Capture reliability | **≥ 90%** of completed custom 1v1s logged without host re-running or manual fix      |
| Stats accuracy      | Telegram W/L matches ledger for **100%** of logged duels in a 2-week dogfood period  |
| Time to query       | Any member can answer "what's our record?" via Telegram in **< 30 seconds**          |
| Group adoption      | **All active duelists** use the bot for stats; host runs client when hosting customs |


### Post-MVP (explicitly out of MVP gate)

Ship after MVP dogfood is stable:

1. **P1 — Trust:** signing, sign status on matches, signed vs. unsigned in stats.
2. **P1 — Polish:** head-to-head, champion names, player/Telegram identity linking, admin replay UX.
3. **P2 — Delight:** new-duel notifications, CSV export, dry-run client mode.

