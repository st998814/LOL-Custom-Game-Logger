# Decisions log

Resolved product and engineering judgments for the LoL Custom Duel Ledger. Requirements live in [UserStories.md](../00-product/UserStories.md); this file records **how** contested semantics were locked so implementers do not re-litigate them.

Format: newest decisions at the top.

---

## DEC-004 — Production hosting: AWS EC2 + Compose

| Field | Value |
|-------|-------|
| **Date** | 2026-11-18 |
| **Status** | Accepted (amended 2026-11-21) |
| **Blocks** | Always-on API + worker + Telegram bot; production Compose/Docker artifacts |
| **Related** | `REQ-OPS-01` (MVP operator topology), `REQ-OPS-05` (always-on AWS host), `REQ-ACC-08` (agent key mechanism), [hosting plan](../04-execution/plans/hosting-backend-aws-ec2.md), [issue #52](https://github.com/st998814/LOL-Custom-Game-Logger/issues/52) |

### Context

MVP dogfood (`REQ-OPS-01`) runs API, worker, and bot on an **operator laptop**, with PostgreSQL on **Supabase**. That topology cannot keep Telegram stats available when the laptop sleeps. The group wants a real always-on host. Constraints: prefer **AWS** (cert + job-market practice), stay inside **free-plan / credit** limits, and **defer** capture-agent packaging (no solid agent UI; Win/macOS distribution not designed yet).

### Decision

1. **Host only** the application tier (Express API + worker) and presentation tier (Telegram bot) as always-on processes.
2. **Platform:** a single **AWS EC2** instance running **Docker Compose** (`api`, `worker`, `bot`, `caddy`, **`redis`**). Prefer EC2 over Lightsail for learning/cert signal.
3. **Network:** **public HTTPS** to the API (Caddy + Let’s Encrypt). Do not publish host ports `7871` or Redis `6379`. Bot calls the API on the **Docker network** (`http://api:7871`).
4. **Data:** keep **Supabase** as the data tier. Do not add RDS for this plan. **Redis** is an internal Compose service for **temporary Telegram account-linking tokens only** (TTL 600s); it is not a RawEvent / match-processing queue. Ephemeral Redis is acceptable for v1 (in-flight link tokens may be lost on Redis restart).
5. **Out of scope for this decision:** capture-agent downloadable packages, cross-platform installers, Tailscale-only ingest, ECS/Fargate/EKS/Lambda, ALB+ACM as the v1 TLS path, multi-AZ, OAuth, per-player API keys.
6. **Production auth boundary (amends earlier deferral of `REQ-ACC-08` as a hard gate):** before exposing the API on public HTTPS, enforce a **shared Agent API Key** (`X-Agent-Key` / `AGENT_API_KEY`) on agent-facing routes, fail-closed in production (missing key → process does not serve), protect admin with `ADMIN_API_TOKEN`, and keep admin/bot-only paths off the public Caddy allowlist. Local/dev may omit `AGENT_API_KEY` for convenience when `NODE_ENV` is not `production`.

### Relationship to `REQ-ACC-08`

- This amendment **implements the shared `X-Agent-Key` mechanism** described by `REQ-ACC-08` early, because public HTTPS makes anonymous writes unacceptable.
- It does **not** mark `REQ-ACC-08` fully Done as a product requirement: agent packaging/distribution, broader agent-facing surface hardening, and ownership proof remain out of scope for `REQ-OPS-05` Workstream A.
- No OAuth or per-player API keys in this hosting slice.

### Consequences

- Implement and verify via [hosting-backend-aws-ec2.md](../04-execution/plans/hosting-backend-aws-ec2.md) and `REQ-OPS-05` (Workstream A = repo Compose/auth; Workstream B = live EC2).
- [Runbooks.md](./Runbooks.md) distinguishes MVP operator topology from production EC2 topology (five Compose services including Redis).
- Billing alarms and credit hygiene are part of “done,” not optional polish.
- Local/dev bootstrap ([dev-bootstrap.md](./playbooks/dev-bootstrap.md)) remains valid for development.

### Alternatives considered

| Option | Why rejected / deferred |
|--------|-------------------------|
| Keep operator-laptop forever | Bot/API unavailable when laptop is off |
| Tailscale-only API | Rejected for v1 — group chose public HTTPS |
| Lightsail | Deferred; EC2 chosen for AWS depth |
| Fargate / App Runner / Lambda | Cost + poor fit for long-lived worker + long-poll bot |
| Include agent packaging now | UI and cross-platform distribution not ready |
| Keep ingest anonymous until full `REQ-ACC-08` packaging | Rejected for public HTTPS — shared agent key required fail-closed in production |
| Redis as match-event queue | Rejected — PostgreSQL `RawEvent` remains the processing queue |

---

## DEC-003 — Analytics-first P0 stats command family

| Field | Value |
|-------|-------|
| **Date** | 2026-10-27 |
| **Status** | Accepted |
| **Blocks** | Rewrite of P0 Telegram stats UX; read-API shape for averages / topmost / champion / date |
| **Related** | `REQ-BOT-01` (full `/stats` family), `REQ-BOT-04` (ledger read), `REQ-BOT-06` (champ names), [P0 stats contract](../00-product/UserStories.md#p0-telegram-stats-contract), DEC-001 (outcomes), DEC-002 (`tgId`) |

### Context

The original P0 contract shipped (and marked done) as **scoreboard + memory**: `/stats`, `/stats recent`, `/stats details`, split across `REQ-BOT-01`–`03`. The details row was especially fuzzy (“per-opponent and/or per-match”) and overlapped future h2h (`REQ-BOT-07`). The duel group wants **career analytics** from the same ledger instead: averages, attribute leaders, per-champion splits, and by-date session summaries — without capturing economy stats such as gold. Those intents are now one requirement: **`REQ-BOT-01`**.

### Decision

P0 user-facing `/stats` commands (all under **`REQ-BOT-01`**) are:

| Command | Intent |
|---------|--------|
| `/stats` | All-time W–L counts |
| `/stats average` | All-time win rate, avg duration, avg FB rate, avg FT rate, avg CS |
| `/stats topmost` | Top-1 leaders across attributes derivable from stored fields |
| `/stats <champion>` | Games, W–L, and win-reason split for one champion |
| `/stats <date>` | Game count and W–L for calendar date `yy/mm/dd` |

**Retired from the P0 product contract:** `/stats recent`, `/stats details`.

**Explicitly out of scope for this decision:**

- **Gold** (and any average/topmost that needs gold) — not in the LCU snapshot / `match_players` schema; do not add gold to satisfy this family.
- Restoring dual-payload “details” (full history dump + by-opponent) as a P0 command.
- Named head-to-head (`REQ-BOT-07`) and champion **name** map (`REQ-BOT-06`) remain P1; P0 may use numeric champion ids.

**Argument parse order** (when a single `/stats` argument is present):

1. Reserved keywords: `average`, `topmost` (and no-arg default for W–L).
2. Date pattern `yy/mm/dd`.
3. Otherwise: champion token (name when `REQ-BOT-06` exists; else numeric id).

**Identity** unchanged: presentation passes `tgId`; application resolves the linked player (DEC-002).

**Win-reason analytics:** for topmost and per-champion splits, count house evidences on **wins**. Multiple evidences on one win may each increment a bucket (DEC-001 OR is not exclusive).

**Target read surface** (paths illustrative; implementers may rename when replacing recent/details):

| Intent | Suggested path |
|--------|----------------|
| All-time W–L | `GET /api/stats?tgId=` |
| Averages | `GET /api/stats/average?tgId=` |
| Topmost | `GET /api/stats/topmost?tgId=` |
| By champion | `GET /api/stats/champion?tgId=&championId=` (or name once mapped) |
| By date | `GET /api/stats/date?tgId=&date=yy/mm/dd` |

### Consequences

- [UserStories.md](../00-product/UserStories.md) keeps a **single** `REQ-BOT-01` for the whole family; former `REQ-BOT-02` / `REQ-BOT-03` IDs are retired (merged). `REQ-BOT-01` is not Done until the analytics family ships.
- Roadmap / MVP acceptance text that still cites `/stats recent` and `/stats details` must be revised in a follow-up docs pass.
- Server may keep legacy `/api/stats/recent` and `/details` until callers migrate; they are **not** the product contract.
- DEC-002’s older “Target surface” table listing recent/details is **superseded for command intent** by this decision; `tgId` identity rules in DEC-002 remain in force.

---

## DEC-002 — Stats query identity is Telegram `tgId`

| Field | Value |
|-------|-------|
| **Date** | 2026-10-17 |
| **Status** | Accepted |
| **Blocks** | Presentation `/stats` wiring; read-API identity migration |
| **Related** | `REQ-BOT-01` / `REQ-BOT-04` (consume stats), `REQ-ACC-03` (link stores `tg_id`), `REQ-BOT-05` (Riot-id / broader resolution still P1) |

### Context

M3 originally planned a **local Telegram → `puuid` map** in the bot config so `/stats` could call `GET /api/stats?puuid=…` before account linking shipped. Linking (`REQ-ACC-03`) now stores `players.tg_id`. Restoring the map would duplicate identity in the presentation tier and drift from the link model.

### Decision

- The **presentation → application** stats contract identifies the querying player by **Telegram user id** (`tgId`), not by `puuid` and not via a bot-local map.
- The bot passes `tgId` from the Telegram chat user (e.g. `update.effective_user.id`).
- The **application tier** resolves `tgId` → linked `players` row, then aggregates stats. Presentation does not map to `puuid`.
- Unlinked (or unknown) `tgId` → clear client-facing failure (e.g. `404` / link-first message), not a missing config file.
- Ledger internals remain PUUID-keyed; `tgId` is only the **query key** for bot “me” stats.

**Target surface** (identity is `tgId`; command set superseded by [DEC-003](#dec-003--analytics-first-p0-stats-command-family)):

| Intent | Path |
|--------|------|
| All-time W–L | `GET /api/stats?tgId=` |
| ~~Recent (last 5)~~ | ~~`GET /api/stats/recent?tgId=`~~ — retired from P0 product contract (DEC-003) |
| ~~Details~~ | ~~`GET /api/stats/details?tgId=`~~ — retired from P0 product contract (DEC-003) |

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
| **Related** | `REQ-SRV-04` (evidence fields), `REQ-BOT-01` (consume outcome via `/stats` family) |

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
| DEC-004 | Production hosting: AWS EC2 + Compose | Accepted |
| DEC-003 | Analytics-first P0 stats command family | Accepted |
| DEC-002 | Stats query identity is Telegram `tgId` | Accepted |
| DEC-001 | Custom duel win judgement | Accepted |
