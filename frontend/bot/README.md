# Telegram bot — Presentation tier

User-facing stats and history via Telegram. Part of the **presentation tier** in the [3-tier architecture](../../docs/01-architecture/SystemArchitecture.md).

**Rules:** the bot calls application **read APIs** only. It must not use Prisma, SQL, or `DATABASE_URL`.

## Current state

| Command | Behavior |
|---------|----------|
| `/test` | Replies with the caller’s Telegram user id |
| `/start <token>` | Completes account link (`POST /api/user/link/complete`, `REQ-ACC-03`) |
| `/stats` | All-time W–L for the **linked** chat user (`REQ-BOT-01`) |
| `/stats average` | Win rate, avg duration, FB/FT rates, avg CS (`REQ-BOT-01` / [DEC-003](../../docs/05-knowledge/Decisions.md#dec-003--analytics-first-p0-stats-command-family)) |
| `/stats topmost` | Most-selected champion id + most common win reason |
| `/stats <championId>` | Per-champion games / W–L / win-reason split (numeric id for P0) |
| `/stats <yy/mm/dd>` | Games + W–L for that **UTC** calendar day |
| `/stats recent` | Retired — bot replies with a redirect to the new family |
| `/stats details` | Retired — bot replies with a redirect to the new family |

Data comes from `GET /api/stats*` on the application tier (`REQ-BOT-04`). Per [DEC-002](../../docs/05-knowledge/Decisions.md#dec-002--stats-query-identity-is-telegram-tgid), the bot passes the chat user’s **`tgId`**; the server resolves the linked ledger player. There is **no** local `player_map`.

## Prerequisites

- **Python 3.12+**
- **Telegram bot token** from [@BotFather](https://t.me/BotFather)
- **Application tier** running (`server/` on `http://127.0.0.1:7871`)
- Caller has **linked** Telegram → ledger player (`/start <token>` after capture-agent QR / link flow)

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

**Pass:** bot logs polling; `/test` returns your Telegram id; linked `/stats` returns W–L.

Stop with `Ctrl+C`.

## Manual smoke

1. Start server API (`cd server && npm run dev`).
2. Confirm read path (replace `TG_ID` with a **linked** Telegram user id):

```bash
curl -s "http://127.0.0.1:7871/api/stats?tgId=TG_ID"
curl -s "http://127.0.0.1:7871/api/stats/average?tgId=TG_ID"
curl -s "http://127.0.0.1:7871/api/stats/topmost?tgId=TG_ID"
curl -s "http://127.0.0.1:7871/api/stats/champion?tgId=TG_ID&championId=54"
curl -s "http://127.0.0.1:7871/api/stats/date?tgId=TG_ID&date=26/03/16"
```

Unlinked id should return `404`. Missing `tgId` should return `400`. Legacy `/api/stats/recent` and `/details` should return `404` (removed).

3. Start the bot; in Telegram:

| Action | Expected |
|--------|----------|
| `/stats` | All-time `W–L` matching the curl body |
| `/stats average` | Rates/means matching `/api/stats/average` |
| `/stats topmost` | Champion id + win-reason leaders (or empty copy) |
| `/stats 54` | Per-champion split for champion id `54` |
| `/stats 26/03/16` | UTC day count + W–L |
| `/stats Garen` | Local “use numeric id” usage (no API call) |
| `/stats recent` | Retired redirect (no API call) |
| Unlinked user `/stats` | `/start <token>` link-first message |
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
- [DEC-003 — Analytics-first `/stats` family](../../docs/05-knowledge/Decisions.md#dec-003--analytics-first-p0-stats-command-family)
- [Dev bootstrap (full stack)](../../docs/05-knowledge/playbooks/dev-bootstrap.md)
- [server/README.md](../../server/README.md) — read APIs the bot calls
- [System architecture §6](../../docs/01-architecture/SystemArchitecture.md) — presentation tier rules
- Issue [#47](https://github.com/st998814/LOL-Custom-Game-Logger/issues/47) — `REQ-BOT-01` analytics-first `/stats` family
