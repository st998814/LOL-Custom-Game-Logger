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

| ID          | Task                 | Description                                                                                                    |
| ----------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| **UC-2-01** | View personal record | Player checks all-time or recent win/loss vs. the group.                                                       |
| **UC-2-02** | View match history   | Player browses past duels (who, when, outcome).                                                                |
| **UC-2-03** | Trust the record     | Results come from captured game data and agreed signing/validation rules, not handwritten notes.               |
| **UC-2-04** | Query on demand      | Player uses a simple interface (e.g. chat commands) instead of opening a spreadsheet.                          |
| **UC-2-05** | Link my identity     | Player links their Telegram account to their League account (PUUID) so the bot knows which records are theirs. |

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
| `REQ-ACC` | Account & identity        |
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

| ID                   | Tier | Task                                                                                                                            | User story | Note                                                                                                                                                                          |
| -------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-SRV-01(Done)** | P0   | Server accepts raw events over HTTP and queues them for processing.                                                             | US-1       | Async ingestion; client does not block on DB writes.                                                                                                                          |
| **REQ-SRV-02(Done)** | P0   | Worker processes `MATCH_SNAPSHOT` events and persists to **PostgreSQL**.                                                        | US-1       | Prisma models: `Match`, `Player`, `MatchPlayer`, `RawEvent`.                                                                                                                  |
| **REQ-SRV-03(Done)** | P0   | Server stores per-match fields: `gameId`, `gameDuration`, `gameCreationDate`.                                                   | US-1       | `gameId` is the primary key; duplicates are rejected.                                                                                                                         |
| **REQ-SRV-04(Done)** | P0   | Server stores per-player fields: `puuid`, `gameName`, `tagLine`, `championId`, `firstBlood`, `firstTower`, `totalCs`, `teamId`. | US-1       | Aligns with LCU snapshot schema; normalize empty/`0000…` puuid to null.                                                                                                       |
| **REQ-SRV-05(Done)** | P0   | Server enforces **1v1 per match** (at most one row per `teamId` per game).                                                      | US-1       | DB unique constraint on `(gameId, teamId)`.                                                                                                                                   |
| **REQ-SRV-06(Done)** | P0   | Server deduplicates ingest by `gameId` / deduplication key.                                                                     | US-1       | Same game must not create two ledger entries.                                                                                                                                 |
| **REQ-SRV-07(Done)** | P0   | Server derives and stores match **winner** from captured outcome data.                                                          | US-2       | House rule: FB **or** first tower **or** CS≥100; store at persist; fail if neither/ambiguous. See [DEC-001](../05-knowledge/Decisions.md#dec-001--custom-duel-win-judgement). |
| **REQ-SRV-08**       | P1   | Server rejects snapshots that fail validation with a recorded error on the raw event.                                           | US-1       | Failed events remain inspectable; supports admin replay.                                                                                                                      |
| **REQ-SRV-09**       | P1   | Admin can inspect and replay a failed raw event by id.                                                                          | US-1       | Recovery path for bad payloads without re-playing the game.                                                                                                                   |
| **REQ-SRV-10**       | P2   | Server exposes read APIs optimized for bot queries (stats, history).                                                            | US-2       | Optional if bot queries Prisma/DB layer directly in v1.                                                                                                                       |

### Telegram bot (sole frontend)

| ID                   | Tier | Task                                                                                  | User story | Note                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ---- | ------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-BOT-01(Done)** | P0   | Users can query stats via the defined `/stats` command family.                        | US-2       | Single requirement for the full P0 family: `/stats`, `/stats average`, `/stats topmost`, `/stats <champion>`, `/stats <date>`. Former `REQ-BOT-02` / `REQ-BOT-03` IDs are retired (merged here). See [P0 stats contract](#p0-telegram-stats-contract) and [DEC-003](../05-knowledge/Decisions.md#dec-003--analytics-first-p0-stats-command-family). |
| **REQ-BOT-04(Done)** | P0   | Bot reads match data from the shared PostgreSQL ledger.                               | US-2       | Telegram is the only UI; no web or mobile app. Outcomes follow [DEC-001](../05-knowledge/Decisions.md#dec-001--custom-duel-win-judgement).                                                                                                                                                                                                          |
| **REQ-BOT-05**       | P1   | Bot resolves players by Riot ID (`gameName` + `tagLine`) or linked Telegram identity. | US-2       | Linked **“me”** stats use `tgId` ([DEC-002](../05-knowledge/Decisions.md#dec-002--stats-query-identity-is-telegram-tgid)). This row covers Riot-id / named-player resolution beyond that.                                                                                                                                                           |
| **REQ-BOT-06**       | P1   | Bot shows champion **names** (not only numeric ids).                                  | US-2       | Required for friendly `/stats <champion>` tokens and topmost champ labels. Until then P0 may accept/show numeric `championId`.                                                                                                                                                                                                                      |
| **REQ-BOT-07**       | P1   | Users can view **head-to-head** record vs. a named opponent.                          | US-2       | e.g. `/stats h2h @friend` or similar.                                                                                                                                                                                                                                                                                                               |
| **REQ-BOT-08**       | P2   | Group receives a Telegram notification when a new duel is logged.                     | US-2       | Optional delight feature for the host's lobby.                                                                                                                                                                                                                                                                                                      |
| **REQ-BOT-09**       | P2   | Users can export duel history to CSV via a bot command.                               | US-2       | Backup and sharing outside Telegram.                                                                                                                                                                                                                                                                                                                |

#### P0 Telegram stats contract

User-facing information each P0 command must be able to return. Outcome / W–L use the house win rule in [DEC-001](../05-knowledge/Decisions.md#dec-001--custom-duel-win-judgement) (not Riot nexus win). Command family locked in [DEC-003](../05-knowledge/Decisions.md#dec-003--analytics-first-p0-stats-command-family).

**Retired from P0 (do not ship as product commands):** `/stats recent`, `/stats details`. Existing server routes may remain until migrated; they are not the user-facing contract.

| Command             | Expect to see                                                                                                                | Example shape                                                                                                         | Real-world use                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/stats`            | All-time **win count** and **loss count**                                                                                    | `Your all time record is 11-5`                                                                                        | Fast scoreboard: “Am I 12–7 all-time?”                                              |
| `/stats average`    | All-time **win rate**, **average game duration**, **average first-blood rate**, **average first-tower rate**, **average CS** | `Your all time win rate: 55%, with 21:25 game duration, 0.3 first tower, 0.2 first blood and 58 CS average in a game` | Career feel without a spreadsheet. **No gold** (not in ledger).                     |
| `/stats topmost`    | Top-1 across attributes available from stored fields (e.g. **most selected champion**, **most common win-reason evidence**)  | `most selected champion: Garen, most win reason: first blood`                                                         | Banter / “what am I known for?” Leaders only — not full leaderboards.               |
| `/stats <champion>` | For that champion: **games played**, **W–L**, **win-reason split** (counts of FB / first tower / CS≥100 among wins)          | `You have 19 games using <champion>, with the record of 11-8, win by 3/5/3 (first blood, first tower, 100 CS)`        | Champ-pool review. Token may be name (`REQ-BOT-06`) or numeric id until names ship. |
| `/stats <date>`     | Games on that calendar date: **count** and **W–L** (date format `yy/mm/dd`)                                                  | `You have played 6 games in <date>, with the record of 4-2`                                                           | “What happened on that session night?”                                              |

**Field notes (P0):**

- **Averages** — rates for first blood / first tower are fractions of the player’s games where that flag was true (0.0–1.0). Duration and CS are means over the player’s matches. **Gold is out of scope** (not captured; do not extend snapshot/schema for gold under this contract).
- **Win-reason split / topmost win reason** — counted from house evidence on games the player **won** (`firstBlood` / `firstTower` / `totalCs ≥ 100`). A single win may increment **more than one** bucket when multiple evidences are true (DEC-001 is flat OR, not exclusive).
- **Date** — match `gameCreationDate`; calendar day uses `yy/mm/dd`. Day boundaries follow UTC unless a later decision sets a group timezone.
- **Champs** — prefer display names when `REQ-BOT-06` is available; numeric `championId` is acceptable for P0 parse/display.
- **Player resolution** (who “me” is) — bot sends the chat user’s `tgId`; application tier resolves the linked ledger player ([DEC-002](../05-knowledge/Decisions.md#dec-002--stats-query-identity-is-telegram-tgid)). No local `player_map`. Named / Riot-id lookup remains `REQ-BOT-05`.
- **Parse order** for `/stats <arg>` — reserved subcommands (`average`, `topmost`) first; then `yy/mm/dd` date pattern; else treat as champion token. See [DEC-003](../05-knowledge/Decisions.md#dec-003--analytics-first-p0-stats-command-family).

---

### Account & identity

Links a player's League account (PUUID) to their Telegram account so the bot knows who “me” is. Serves `UC-2-05`, enables stats by `tgId` ([DEC-002](../05-knowledge/Decisions.md#dec-002--stats-query-identity-is-telegram-tgid)), and remains a prerequisite for broader resolution in `REQ-BOT-05`. This is account **linking**, not authentication: the PUUID is the only League credential; there are no passwords, tokens, or sessions.

**Definitions**

- **Registered** — a `players` row exists with this PUUID. The ingest worker creates it when a match containing that PUUID is persisted (host and opponent alike). There is no explicit registration step or endpoint, and only the worker creates `players` rows (linking never does). Rows with a null PUUID never count.
- **Linked** — that row has a `tg_id`.

| ID                   | Tier | Task                                                                       | User story | Note                                                                                                                                                                                                                                                                                    |
| -------------------- | ---- | -------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-ACC-01(Done)** | P1   | Server reports account status by PUUID: `registered` and `linked`.         | US-2       | `GET /api/user/status?puuid=` → `{ registered, linked }`. Reads the definitions above. Contract in [API.md](../01-architecture/API.md#user-account-req-bot-05).                                                                                                                      |
| **REQ-ACC-02(Done)** | P1   | Server issues an expiring, single-use Telegram link for an unlinked PUUID. | US-2       | Reuses a still-valid link (PUUID → token reverse key) and returns `expiresIn`. `409` if already linked. Does not require registration: the agent requests a link right after ingest `202`, before the worker writes the row.                                                            |
| **REQ-ACC-03(Done)** | P1   | Completing a link binds the Telegram id to an already registered PUUID.    | US-2       | Registration is enforced here only. Unregistered PUUID → distinct `NOT_REGISTERED` error and the token stays valid (retry `/start` once the worker has processed the game). On success consume the token; reject expired tokens; store `tg_id` as 64-bit (Telegram ids exceed 32 bits). |
| **REQ-ACC-04(Done)** | P1   | Capture agent identifies the host after bootstrap and offers the link.     | US-2       | `NEW` → welcome; `UNLINKED` → QR code; first game received for `NEW` → "Your first game was received" + QR code. Delivered in PR #42.                                                                                                                                                   |
| **REQ-ACC-05**       | P1   | Linking is initiated only from the capture agent.                          | US-2       | Non-hosts link by running the agent once with their League account logged in. The bot only completes links. Document in setup (`REQ-OPS-04`).                                                                                                                                           |
| **REQ-ACC-06**       | P2   | Admin can unlink a PUUID (clear its `tg_id`).                              | US-2       | Recovery path for a mistaken or hijacked link; first link otherwise wins (`tg_id` is unique).                                                                                                                                                                                           |
| **REQ-ACC-07**       | P1   | Bot serves only allowlisted Telegram ids.                                  | US-2       | The bot is private-chat only and discoverable by username; the allowlist keeps the user base to known players. Unknown users get a polite refusal.                                                                                                                                      |
| **REQ-ACC-08**       | P2   | Agent-facing endpoints require an agent key header.                        | US-2       | e.g. `X-Agent-Key` from config, constant-time compare, `401` otherwise. Blocks unknown callers only; the key ships with the agent, so it does not prove ownership.                                                                                                                      |
| **REQ-ACC-09**       | P2   | Server verifies the requester owns the PUUID before issuing a link.        | US-2       | Deferred. Candidate: a Riot-signed token from the LCU verified against Riot's public keys (spike needed; undocumented, ToS grey area).                                                                                                                                                  |

**Known limitation (accepted until** `REQ-ACC-09`**):** the server cannot verify that a link request comes from the PUUID's owner. PUUIDs are not secret, so an allowlisted player could link another player's unlinked PUUID first. Mitigated by `REQ-ACC-07` (only known players) and `REQ-ACC-06` (admin unlink).

---

### Credibility & signing

| ID                   | Tier | Task                                                                         | User story | Note                                                                   |
| -------------------- | ---- | ---------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| **REQ-TRU-01(Done)** | P0   | Ledger entries are sourced from LCU capture, not hand-entered forms.         | US-2       | Baseline trust without signing.                                        |
| **REQ-TRU-02**       | P1   | Players can **sign** (attest to) a logged match result.                      | US-2       | In scope but **not top priority**; ships after core logging and stats. |
| **REQ-TRU-03**       | P1   | Ledger shows whether a match is unsigned, partially signed, or fully signed. | US-2       | Both duelists attesting = fully signed.                                |
| **REQ-TRU-04**       | P1   | Stats views indicate signed vs. unsigned matches where relevant.             | US-2       | Group agrees on whether unsigned matches count toward record.          |
| **REQ-TRU-05**       | P2   | Disputed matches can be flagged for review without deleting ledger data.     | US-2       | Audit trail preserved.                                                 |

### Operations & quality

| ID                   | Tier | Task                                                                      | User story | Note                                                 |
| -------------------- | ---- | ------------------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| **REQ-OPS-01(Done)** | P0   | Stack runs on self-hosted server with PostgreSQL.                         | US-1, US-2 | No Riot Match-V5 API; no third-party match hosting.  |
| **REQ-OPS-02**       | P0   | Raw-event worker retries failed processing up to a bounded limit.         | US-1       | Matches existing worker `MAX_RETRIES` behavior.      |
| **REQ-OPS-03**       | P1   | Team can measure basic funnel: events received → processed → failed.      | US-1       | Via raw event status counts or simple admin queries. |
| **REQ-OPS-04**       | P2   | Host can run client and bot on supported platforms with documented setup. | US-1       | README covers League + Python + server dependencies. |


