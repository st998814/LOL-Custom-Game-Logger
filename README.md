# LoL Custom Duel Ledger

Automatic ledger for custom League of Legends 1v1 duels. When a game ends, a local client on the **host's PC** captures match data from the League Client (LCU) and sends it to a central server; the duel group queries win/loss and history through a Telegram bot.

**Local dev:** see [docs/05-knowledge/playbooks/dev-bootstrap.md](docs/05-knowledge/playbooks/dev-bootstrap.md) to bootstrap the 3-tier stack (Data → Application → Presentation).

**Host capture:** see [client/README.md](client/README.md) for who runs the LCU client, prerequisites, and how to start it.

## Repository layout

| Path | Role |
|------|------|
| [`client/`](client/) | LCU capture client (host machine) |
| [`server/`](server/) | Ingest API, worker, PostgreSQL persistence |
| [`frontend/bot/`](frontend/bot/) | Telegram bot (stats and history) |
| [`docs/`](docs/) | Product, architecture, engineering docs, [runbooks](docs/05-knowledge/Runbooks.md) |
