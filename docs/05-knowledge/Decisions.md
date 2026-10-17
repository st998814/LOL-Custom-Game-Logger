# Decisions log

Resolved product and engineering judgments for the LoL Custom Duel Ledger. Requirements live in [UserStories.md](../00-product/UserStories.md); this file records **how** contested semantics were locked so implementers do not re-litigate them.

Format: newest decisions at the top.

---

## DEC-002 — Stats query identity is Telegram `tgId`

| Field | Value |
|-------|-------|
| **Date** | 2026-10-17 |
| **Status** | Accepted |
| **Blocks** | Presentation `/stats` wiring; read-API identity migration |
| **Related** | `REQ-BOT-01`–`REQ-BOT-04` (consume stats), `REQ-ACC-03` (link stores `tg_id`), `REQ-BOT-05` (Riot-id / broader resolution still P1) |

### Context

M3 originally planned a **local Telegram → `puuid` map** in the bot config so `/stats` could call `GET /api/stats?puuid=…` before account linking shipped. Linking (`REQ-ACC-03`) now stores `players.tg_id`. Restoring the map would duplicate identity in the presentation tier and drift from the link model.

### Decision

- The **presentation → application** stats contract identifies the querying player by **Telegram user id** (`tgId`), not by `puuid` and not via a bot-local map.
- The bot passes `tgId` from the Telegram chat user (e.g. `update.effective_user.id`).
- The **application tier** resolves `tgId` → linked `players` row, then aggregates stats. Presentation does not map to `puuid`.
- Unlinked (or unknown) `tgId` → clear client-facing failure (e.g. `404` / link-first message), not a missing config file.
- Ledger internals remain PUUID-keyed; `tgId` is only the **query key** for bot “me” stats.

**Target surface** (paths unchanged; query param changes):

| Intent | Path |
|--------|------|
| All-time W–L | `GET /api/stats?tgId=` |
| Recent (last 5) | `GET /api/stats/recent?tgId=` |
| Details | `GET /api/stats/details?tgId=` |

### Consequences

- Do **not** restore `frontend/bot/config/player_map.json` as the identity path.
- Server read APIs must accept `tgId` (and stop requiring the bot to know `puuid`). A temporary `puuid` query param may remain only until migration completes.
- `REQ-BOT-05` Riot-id / named-player resolution remains separate; this decision covers **linked “me”** only.
- Update [API.md](../01-architecture/API.md), [SystemArchitecture.md](../01-architecture/SystemArchitecture.md) §9.2, and bot/bootstrap docs to match.

### Alternatives considered

| Option | Why rejected |
|--------|----------------|
| Keep / restore local `player_map` | Duplicates link state; presentation owns identity |
| Bot calls a resolve endpoint then `?puuid=` | Extra hop; bot still handles ledger identity |
| Keep `?puuid=` forever for stats | Forces presentation to store or learn PUUID |

---

## DEC-001 — Custom duel win judgement

| Field | Value |
|-------|-------|
| **Date** | 2026-07-15 |
| **Status** | Accepted |
| **Blocks** | [#28](https://github.com/st998814/LOL-Custom-Game-Logger/issues/28), unlocks [#24](https://github.com/st998814/LOL-Custom-Game-Logger/issues/24) (`REQ-SRV-07`) |
| **Related** | `REQ-SRV-04` (evidence fields), `REQ-BOT-01`–`REQ-BOT-03` (consume outcome) |

### Context

Group customs are **not** decided by LCU nexus / Riot `stats.win`. Outcome is a **house rule** over fields already captured at game end: `firstBlood`, `firstTower`, `totalCs`. Product docs previously said only “derive and store winner” without defining the rule ([#28](https://github.com/st998814/LOL-Custom-Game-Logger/issues/28)).

### Decision

#### Win rule (OR, not priority-ordered)

A player **wins** the duel if **any** of the following is true for that player:

1. `firstBlood == true`, **or**
2. `firstTower == true`, **or**
3. `totalCs >= 100`

There is **no** ranking among the three conditions. First blood does not outrank first tower or CS; a single true condition is enough.

Evidence columns remain the audit trail (`match_players.first_blood`, `first_tower`, `total_cs` from `REQ-SRV-04`).

#### Game end

- The **host (or players) ends the custom game manually** when the house condition is met (or when they stop playing).
- The product does **not** auto-terminate League when FB / first tower / CS≥100 is reached.

#### Persist form

- The server **derives the winner once at match persist** and **stores** it on the ledger (`REQ-SRV-07`).
- Do **not** rely on Telegram (or other readers) re-deriving W/L only at query time for the canonical record.
- Exact column shape (`winningTeamId`, `winnerPlayerId`, and/or `match_players.won`) is an implementation choice for `#24`, as long as bot stats can answer “who won this match?” unambiguously.

#### Failure semantics

After a valid 1v1 snapshot is processed, if the rule cannot name **exactly one** winner, **fail processing** (raw event fails / no silent wrong winner):

| Situation | Result |
|-----------|--------|
| Exactly one player satisfies the OR rule | Persist match + stored winner |
| **Neither** player qualifies (no FB, no first tower, both CS < 100) | Fail processing |
| **Ambiguous** (both players satisfy the OR rule, e.g. both CS ≥ 100) | Fail processing |
| Conflicting / corrupt exclusive flags (e.g. both `firstBlood`) | Fail processing |

### Consequences

- Implementation of `REQ-SRV-07` must use this rule — not LCU `teams[].win` / `stats.win` — unless a later decision supersedes this one.
- Fixtures and verification must include: clear single winner; neither; ambiguous dual qualify.
- Changing the CS threshold or OR definition later requires a new decision entry and, if store-on-persist stays, a migration/backfill plan for historical rows.

### Alternatives considered

| Option | Why rejected / deferred |
|--------|-------------------------|
| Derive winner only at Telegram query time | Weaker fit for “stores winner”; thinner ledger trust; bot must own the fail gate |
| Priority order (FB → tower → CS) | Group rule is flat OR |
| Use Riot nexus / `stats.win` | Does not match how this group decides customs |
| Leave winner NULL on incomplete matches | Rejected: fail processing so bad outcomes never enter W/L |

---

## Index

| ID | Title | Status |
|----|-------|--------|
| DEC-002 | Stats query identity is Telegram `tgId` | Accepted |
| DEC-001 | Custom duel win judgement | Accepted |
