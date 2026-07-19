# Telegram bot — Presentation tier

User-facing stats and history via Telegram. Part of the **presentation tier** in the [3-tier architecture](../../docs/01-architecture/SystemArchitecture.md).

**Rules:** the bot calls application **read APIs** only. It must not use Prisma, SQL, or `DATABASE_URL`.

## Current state

| Command | Behavior |
|---------|----------|
| `/test` | Replies `testing` |
| `/stats` | All-time W–L for the mapped player (`REQ-BOT-01`) |
| `/stats recent` | Last 5 duels (`REQ-BOT-02`) |
| `/stats details` | All-time by-opponent + match list (`REQ-BOT-03`) |

Data comes from `GET /api/stats*` on the application tier (`REQ-BOT-04`). Telegram → ledger player uses a **local puuid map** until `REQ-BOT-05`.

## Prerequisites

- **Python 3.12+**
- **Telegram bot token** from [@BotFather](https://t.me/BotFather)
- **Application tier** running (`server/` on `http://127.0.0.1:7871`) with ledger rows for the mapped `puuid`

## Install

```bash
cd frontend/bot
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install python-telegram-bot
```

## Configure

```bash
export TELEGRAM_BOT_TOKEN="your-token-from-botfather"
export API_BASE_URL="http://127.0.0.1:7871"   # optional; this is the default
```

### Player map (Telegram user id → puuid)

```bash
cp config/player_map.json.example config/player_map.json
```

Edit `config/player_map.json`:

```json
{
  "123456789": "your-ledger-puuid"
}
```

| How to get… | Where |
|-------------|--------|
| Telegram user id | Message [@userinfobot](https://t.me/userinfobot) (or similar), or check bot logs after an unmapped `/stats` reply |
| Ledger `puuid` | `players.puuid` in Postgres / Prisma Studio for a persisted duelist |

`config/player_map.json` is gitignored. Override path with `PLAYER_MAP_PATH` if needed.

## Start

With the application API running:

```bash
python main.py
```

**Pass:** bot logs polling; `/test` returns `testing`; `/stats` returns W–L for a mapped user (or a clear unmapped / API error message).

Stop with `Ctrl+C`.

## Manual smoke (#31)

1. Start server API (`cd server && npm run dev`).
2. Confirm read path (replace `PUUID` with a real `players.puuid`):

```bash
curl -s "http://127.0.0.1:7871/api/stats?puuid=PUUID"
curl -s "http://127.0.0.1:7871/api/stats/recent?puuid=PUUID"
curl -s "http://127.0.0.1:7871/api/stats/details?puuid=PUUID"
```

3. Map your Telegram id → that puuid in `config/player_map.json`.
4. Start the bot; in Telegram:

| Action | Expected |
|--------|----------|
| `/stats` | All-time `W–L` matching the curl body |
| `/stats recent` | Up to 5 duels (opponent, outcome, champs, date) |
| `/stats details` | By-opponent W–L and/or full match list |
| Unmapped user `/stats` | Message asking to add Telegram id to the map |
| Bot env has **no** `DATABASE_URL` | Still works (HTTP only) |

## Layout

```
frontend/bot/
├── main.py                 # Entry — starts polling
├── bot.py                  # build_application()
├── config/                 # Token/URL settings + player map
├── clients/                # HTTP client for /api/stats*
├── services/               # Command → API orchestration
├── presenters/             # JSON → Telegram text
├── handlers/               # CommandHandler wiring
├── commands.json           # Historical command sketch
└── README.md
```

## Troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| `TELEGRAM_BOT_TOKEN is required` | Env not set | Export `TELEGRAM_BOT_TOKEN` |
| `Invalid token` / auth error | Wrong token | Verify with BotFather |
| Unmapped account message | Missing map entry | Add Telegram id → puuid in `player_map.json` |
| `Stats API unreachable` | Server down / wrong URL | Start `server/`; check `API_BASE_URL` |
| `No player found for your mapped puuid` | Bad puuid / empty ledger | Confirm `players.puuid` in DB |
| Bot silent | Process not running | Restart `python main.py` |

## Related docs

- [Dev bootstrap (full stack)](../../docs/05-knowledge/playbooks/dev-bootstrap.md)
- [server/README.md](../../server/README.md) — read APIs the bot calls
- [System architecture §6](../../docs/01-architecture/SystemArchitecture.md) — presentation tier rules
- Issue [#31](https://github.com/st998814/LOL-Custom-Game-Logger/issues/31) — M3 P0 `/stats` family
