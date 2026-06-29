# LoL Custom Duel Ledger — Roadmap

**Steven** — Jun 22, 2026

Release plan and MVP gates. Product context is in [PRD](./PRD.md); detailed requirements are in [User Stories](./UserStories.md).

---

## MVP definition

The **MVP** (minimum viable product) is the smallest release that lets the duel group **stop using spreadsheets or paper** for custom 1v1 results. MVP ships when every **P0** requirement in [User Stories](./UserStories.md#requirements) is satisfied and the group can complete the full loop below without manual data entry.

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

MVP includes **all P0 rows** across:

- Duel capture (LCU client on host machine)
- Ledger & server (PostgreSQL, validation, dedupe, winner)
- Telegram bot (`/stats`, `/stats recent`, `/stats details`)
- Operations (self-hosted stack, raw-event retries)

### Core user loop (must work end-to-end)

```
Custom 1v1 ends → host client captures via LCU → server writes ledger → any player queries /stats in Telegram
```

---

## Implementation milestones

Work milestones **in order** (M1 → M2 → M3 → M4). Do not start P1 work until M4 is complete or explicitly deferred.

| Milestone                   | Outcome                                                                          | P0 requirements covered                                                |
| --------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **M1 — Capture path**       | Host finishes a duel; snapshot reaches server and lands in PostgreSQL.           | LCU client P0 rows; server ingest + worker P0 (except winner if split) |
| **M2 — Ledger correctness** | Each game is one row; 2-player only; duplicates rejected; winner stored.         | Validation, dedupe, 1v1 constraint, winner derivation                  |
| **M3 — Read path**          | Telegram returns correct all-time, recent, and detailed stats from the ledger.   | All Telegram bot P0 rows                                               |
| **M4 — Dogfood**            | Duel group uses MVP for real customs without maintaining a parallel spreadsheet. | Operational validation                                                 |

---

## Definition of Done

A P0 requirement is **done** when:

1. **Implemented** in the codebase and deployed to the group's environment.
2. **Verified** against acceptance criteria (manual test or automated check).
3. **Traceable** to the user-story row (issue/PR references the task text or ID).

---

## MVP acceptance test (vertical slice)

The MVP is **shipped** when this scenario passes:

1. Two players complete a **custom 1v1** with the **host** running the LCU client.
2. Within a reasonable window after game end, exactly **one** match appears in PostgreSQL with correct `gameId`, players, duration, and **winner**.
3. Submitting the same snapshot again does **not** create a duplicate entry.
4. A non-host player runs `/stats` and sees the correct **all-time win/loss**.
5. `/stats recent` lists the duel among the last five games with correct outcome.
6. `/stats details` shows a consistent per-match or per-player breakdown.
7. The group agrees they can **stop updating** their manual spreadsheet for new duels.

---

## Success metrics (duel group)

| Metric              | Target                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| Manual logging      | **0** new duels recorded in spreadsheet/paper after MVP adoption                     |
| Capture reliability | **≥ 90%** of completed custom 1v1s logged without host re-running or manual fix      |
| Stats accuracy      | Telegram W/L matches ledger for **100%** of logged duels in a 2-week dogfood period  |
| Time to query       | Any member can answer "what's our record?" via Telegram in **< 30 seconds**          |
| Group adoption      | **All active duelists** use the bot for stats; host runs client when hosting customs |

---

## Post-MVP

Ship after MVP dogfood is stable:

1. **P1 — Trust:** signing, sign status on matches, signed vs. unsigned in stats.
2. **P1 — Polish:** head-to-head, champion names, player/Telegram identity linking, admin replay UX.
3. **P2 — Delight:** new-duel notifications, CSV export, dry-run client mode.
