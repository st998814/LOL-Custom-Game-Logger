# Telegram bot — Presentation tier

User-facing stats and history via Telegram. Part of the **presentation tier** in the [3-tier architecture](../../docs/01-architecture/SystemArchitecture.md).

**Rules:** the bot calls application **read APIs** only. It must not use Prisma, SQL, or `DATABASE_URL`.

## Current state

Early development. Implemented commands:

| Command | Behavior |
|---------|----------|
| `/test` | Replies `testing` |
| `/show` | Replies `show the all-time match result` (stub) |

Planned commands are sketched in `commands.json` (`/stats` variants). Wiring to server read APIs is future work.

## Prerequisites

- **Python 3.12+**
- **Telegram bot token** from [@BotFather](https://t.me/BotFather)
- **Application tier** running when testing API-backed commands (`server/` on `http://127.0.0.1:7871`)

## Install

```bash
cd frontend/bot
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install python-telegram-bot
```

## Configure

Set the bot token via environment variable (recommended):

```bash
export TELEGRAM_BOT_TOKEN="your-token-from-botfather"
```

> **Security:** avoid committing tokens. If `bot.py` still contains a hardcoded token from early dev, move it to `TELEGRAM_BOT_TOKEN` before sharing the repo.

Optional — API base URL for future read calls (not yet used by all handlers):

```bash
export API_BASE_URL="http://127.0.0.1:7871"
```

## Start

With the application API running:

```bash
python main.py
```

**Pass:** bot logs polling activity; `/test` in Telegram returns `testing`.

Stop with `Ctrl+C`.

## Expected layout

```
frontend/bot/
├── main.py          # Entry — starts polling
├── bot.py           # Application, handlers
└── commands.json    # Planned command spec (reference)
```

## Troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| `Invalid token` / auth error | Wrong or missing token | Set `TELEGRAM_BOT_TOKEN`; verify with BotFather |
| Bot silent | Process not running | Check terminal; restart `python main.py` |
| Stats commands empty / errors | Read APIs not implemented | Expected during early dev; check server routes |

## Related docs

- [Dev bootstrap (full stack)](../../docs/05-knowledge/playbooks/dev-bootstrap.md)
- [server/README.md](../../server/README.md) — APIs the bot will call
- [System architecture §2.5](../../docs/01-architecture/SystemArchitecture.md) — presentation tier rules
