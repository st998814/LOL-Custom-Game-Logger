# Telegram bot — Presentation tier

User-facing stats and history via Telegram. Part of the **presentation tier** in the [3-tier architecture](../../docs/01-architecture/SystemArchitecture.md).

**Rules:** the bot calls application **read APIs** only. It must not use Prisma, SQL, or `DATABASE_URL`.

## Current state

| Command | Behavior |
|---------|----------|
| `/test` | Replies with the caller’s Telegram user id |
| `/start <token>` | Completes account link (`POST /api/user/link/complete`, `REQ-ACC-03`) |
| `/stats` | All-time W–L for the **linked** chat user (`REQ-BOT-01`) — target |
| `/stats recent` | Last 5 duels (`REQ-BOT-02`) — target |
| `/stats details` | All-time by-opponent + match list (`REQ-BOT-03`) — target |

Data comes from `GET /api/stats*` on the application tier (`REQ-BOT-04`). Per [DEC-002](../../docs/05-knowledge/Decisions.md#dec-002--stats-query-identity-is-telegram-tgid), the bot passes the chat user’s **`tgId`**; the server resolves the linked ledger player. There is **no** local `player_map`.

## Prerequisites

- **Python 3.12+**
- **Telegram bot token** from [@BotFather](https://t.me/BotFather)
- **Application tier** running (`server/` on `http://127.0.0.1:7871`)
- Caller has **linked** Telegram → PUUID (`/start` after capture-agent QR / link flow)

## Install

```bash
cd frontend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Configure

```bash
export TG_BOT_API_TOKEN="your-token-from-botfather"
# Optional: API base (default in config is http://127.0.0.1:7871/api/)
```

## Start

With the application API running:

```bash
python main.py
```

**Pass:** bot logs polling; `/test` returns your Telegram id; linked `/stats` returns W–L (once stats actions + `tgId` APIs are wired).

Stop with `Ctrl+C`.

## Manual smoke

1. Start server API (`cd server && npm run dev`).
2. Confirm read path (replace `TG_ID` with a **linked** Telegram user id):

```bash
curl -s "http://127.0.0.1:7871/api/stats?tgId=TG_ID"
curl -s "http://127.0.0.1:7871/api/stats/recent?tgId=TG_ID"
curl -s "http://127.0.0.1:7871/api/stats/details?tgId=TG_ID"
```

> **Migration:** server may still accept `?puuid=` until the DEC-002 cutover. New clients use `tgId` only.

3. Start the bot; in Telegram:

| Action | Expected |
|--------|----------|
| `/stats` | All-time `W–L` matching the curl body |
| `/stats recent` | Up to 5 duels (opponent, outcome, champs, date) |
| `/stats details` | By-opponent W–L and/or full match list |
| Unlinked user `/stats` | Clear “link first” / not-found message |
| Bot env has **no** `DATABASE_URL` | Still works (HTTP only) |

## Layout

```
frontend/
├── main.py                 # Entry — starts polling
└── bot/
    ├── __init__.py         # build_application()
    ├── config.py           # Token / API base URL
    ├── actions/            # Command orchestration (/stats, /start, …)
    ├── services/client.py  # HTTP client for application APIs
    ├── presenters/         # JSON → Telegram text
    ├── handlers/           # CommandHandler wiring
    └── README.md
```

## Troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| Token missing / assert | Env not set | Export `TG_BOT_API_TOKEN` |
| `Invalid token` / auth error | Wrong token | Verify with BotFather |
| Unlinked / not found on `/stats` | No `players.tg_id` for this user | Complete `/start <token>` from capture agent |
| `Stats API unreachable` | Server down / wrong URL | Start `server/`; check API base URL |
| Bot silent | Process not running | Restart `python main.py` from `frontend/` |

## Related docs

- [DEC-002 — Stats query identity](../../docs/05-knowledge/Decisions.md#dec-002--stats-query-identity-is-telegram-tgid)
- [Dev bootstrap (full stack)](../../docs/05-knowledge/playbooks/dev-bootstrap.md)
- [server/README.md](../../server/README.md) — read APIs the bot calls
- [System architecture §6](../../docs/01-architecture/SystemArchitecture.md) — presentation tier rules
- Issue [#31](https://github.com/st998814/LOL-Custom-Game-Logger/issues/31) — M3 P0 `/stats` family
