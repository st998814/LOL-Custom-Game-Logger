# Decisions log

Resolved product and engineering judgments for the LoL Custom Duel Ledger. Requirements live in [UserStories.md](../00-product/UserStories.md); this file records **how** contested semantics were locked so implementers do not re-litigate them.

Format: newest decisions at the top.

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
| DEC-001 | Custom duel win judgement | Accepted |
