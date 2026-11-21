# LoL Custom Duel Ledger

Automatic ledger for custom League of Legends 1v1 duels. When a game ends, a local agent on the **host's PC** captures match data from the League Client (LCU) and sends it to a central server; the duel group queries win/loss and history through a Telegram bot.

**Local / MVP dogfood:** see [docs/05-knowledge/playbooks/dev-bootstrap.md](docs/05-knowledge/playbooks/dev-bootstrap.md) to bootstrap the 3-tier stack (Data → Application → Presentation). Operator topology (REQ-OPS-01): [Runbooks — MVP operator topology](docs/05-knowledge/Runbooks.md#mvp-operator-topology-req-ops-01).

**Always-on production (REQ-OPS-05):** five-service Docker Compose (`api`, `worker`, `bot`, `caddy`, `redis`) on AWS EC2 — [EC2 Compose deploy playbook](docs/05-knowledge/playbooks/aws-ec2-compose-deploy.md). Repo readiness: [Workstream A verification](docs/04-execution/verification/REQ-OPS-05-workstream-a-verification.md).

**Host capture:** see [capture_agent/README.md](capture_agent/README.md) for who runs the LCU agent, prerequisites, and how to start it.

## Repository layout

| Path | Role |
|------|------|
| [`capture_agent/`](capture_agent/) | LCU capture agent (host machine) |
| [`server/`](server/) | Ingest API, worker, PostgreSQL persistence |
| [`frontend/bot/`](frontend/bot/) | Telegram bot (stats and history) |
| [`docs/`](docs/) | Product, architecture, engineering docs, [runbooks](docs/05-knowledge/Runbooks.md) |
