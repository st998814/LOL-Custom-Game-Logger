# LoL Custom Duel Ledger — Product Requirements

**Steven** — Jun 22, 2026

*As a player who enjoys 1-on-1 custom duels with friends, I want match results logged and persisted automatically so I don't have to maintain records by hand.*

*As a member of a duel group, I want a shared, trustworthy history of our matches so we can settle scores and track performance over time.*

*Unofficial fan tool — not affiliated with or endorsed by Riot Games.*

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

---

## Vision & Opportunity

**Vision:** A simple, automatic **ledger** for custom LoL 1v1 duels — capture results when a game ends, store them in one place, and let the group view stats and history without spreadsheets or arguments.

**Opportunity:**

- **Underserved niche.** Custom duels are a common social format among friends, but no mainstream product targets "our private 1v1 ledger" specifically.
- **Automation is feasible.** Match metadata is available locally via the **League Client (LCU)** at game end, so logging doesn't have to be manual.
- **Credibility as differentiator.** A signed, transparent record (who played, who won, when) turns informal duels into a **trusted shared history** — aligned with the product's credibility and transparency goals.
- **Lightweight delivery.** A small group tool (e.g. Telegram for queries, a local client for capture, a central store for persistence) can ship an MVP without Riot API integration or ranked-scale infrastructure.
- **Room to grow.** The same model can extend to richer stats, head-to-head views, and group features once core logging is solid.

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

**Signing** (match attestation by players) is **in scope** but **not top priority** — core logging and stats ship first; signing strengthens trust in a later milestone. See [Roadmap](./Roadmap.md#post-mvp).

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

End-to-end: two players finish a custom 1v1 → host client captures via LCU → server validates and writes the ledger → any group member queries via Telegram.

Component boundaries and tier rules are defined in [System Architecture](../01-architecture/SystemArchitecture.md).

### Out of scope (MVP)

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

## Related documents

| Document | Contents |
| -------- | -------- |
| [User Stories](./UserStories.md) | Epics, use cases, and prioritized requirements (P0–P2) |
| [Roadmap](./Roadmap.md) | MVP definition, milestones, acceptance criteria, success metrics, post-MVP |
| [System Architecture](../01-architecture/SystemArchitecture.md) | Component design, tier boundaries, and technical contracts |
