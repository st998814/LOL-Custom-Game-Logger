# AWS EC2 + Compose deploy playbook (REQ-OPS-05)

Operator guide for the **always-on** five-service stack on a single EC2 instance.

| Workstream | Status |
|------------|--------|
| **A — Repository** | Compose/Docker/auth/docs in repo — see [Workstream A verification](../../04-execution/verification/REQ-OPS-05-workstream-a-verification.md) |
| **B — Live AWS** | Provision instance, DNS, billing alarms, laptop-off proof — **not done until executed** |

Decision: [DEC-004](../Decisions.md#dec-004--production-hosting-aws-ec2--compose). Plan: [hosting-backend-aws-ec2.md](../../04-execution/plans/hosting-backend-aws-ec2.md).

## Target stack

```
Internet ──HTTPS :443──► Caddy ──► api:7871
                         worker (Postgres RawEvent queue)
                         bot ──► http://api:7871/api/
                         redis (linking tokens only; internal)
                                      │
                                      ▼
                               Supabase PostgreSQL
```

| Service | Image | Host ports |
|---------|-------|------------|
| `api` | `lol-ledger-server` (`npm start`) | none (internal `7871`) |
| `worker` | same image (`npm run worker`) | none |
| `bot` | `lol-ledger-bot` | none |
| `caddy` | `caddy:2.8.4-alpine` | `80`, `443` |
| `redis` | `redis:7.2.5-alpine` | none (do **not** publish `6379`) |

Ephemeral Redis (v1): pending Telegram link tokens (TTL 600s) may be lost on Redis restart.

## Cost-control checklist (do before leaving resources running)

- [ ] Billing alarms (e.g. $5 and $10) in the AWS account
- [ ] No ALB, NAT Gateway, or RDS in v1
- [ ] One region, one EC2 instance
- [ ] Avoid orphan EBS volumes and idle Elastic IPs
- [ ] Prefer `t3.micro` (AMD64) or `t4g.micro` (ARM64); match image architecture ([docker-images.md](./docker-images.md))

## AWS setup outline (Workstream B)

1. IAM user/role for daily admin (not root).
2. EC2 + security group: `443`/`80` public; `22` from operator IP only; **no** `7871`/`6379` inbound.
3. DNS A/AAAA → instance public IP (or Elastic IP if used carefully).
4. Install Docker Engine + Compose plugin on the instance.
5. Clone repo (or sync release tag); create host `.env` from [`.env.example`](../../../.env.example).

## Secrets provisioning

| Variable | Who |
|----------|-----|
| `DATABASE_URL` | `api`, `worker` |
| `DIRECT_URL` | **migrate profile only** |
| `REDIS_URL` | Compose sets `redis://redis:6379` for `api` |
| `AGENT_API_KEY`, `ADMIN_API_TOKEN` | `api` (required when `NODE_ENV=production`) |
| `TG_BOT_API_TOKEN` | `bot` only |
| `DOMAIN` | `caddy` |

Never commit `.env`. Bot and Caddy must not receive database URLs. Details: [deploy/README.md](../../../deploy/README.md).

Capture agent (laptop dogfood against public HTTPS) needs the same `AGENT_API_KEY` as `X-Agent-Key` and `API_BASE_URL=https://<DOMAIN>/api/`.

## Image build / pull strategy

On the instance (or CI that pushes to a registry):

```bash
# Match host arch (see docker-images.md for cross-build notes)
docker build -t lol-ledger-server:local ./server
docker build -f frontend/bot/Dockerfile -t lol-ledger-bot:local ./frontend
```

Tag releases with a version or git SHA when promoting (e.g. `lol-ledger-server:2026-11-21`). For MVP, building on the instance from a tagged commit is enough.

## Initial deploy

```bash
cp .env.example .env   # fill real secrets
docker compose config  # sanity-check

# One-shot schema apply (not on every worker restart)
docker compose --profile migrate run --rm migrate

docker compose up -d --build
docker compose ps
curl -fsS https://<DOMAIN>/healthz
```

Validate Caddy before first TLS issuance: [deploy/README.md](../../../deploy/README.md).

## Update / restart

```bash
git fetch && git checkout <tag-or-sha>
docker compose build api worker bot
docker compose up -d
# If migrations added:
docker compose --profile migrate run --rm migrate
```

## Logs

```bash
docker compose logs -f api worker bot caddy redis
docker compose logs --tail=200 worker
```

## Health checks

| Probe | Meaning |
|-------|---------|
| `GET /healthz` | Process alive (Compose uses this — avoids restart loops on transient DB blips) |
| `GET /readyz` | Postgres + Redis reachable for API |

```bash
curl -fsS https://<DOMAIN>/healthz
curl -fsS https://<DOMAIN>/readyz   # may 503 during brief outages; API container should stay up
docker compose ps
```

## Reboot recovery

Services use `restart: unless-stopped`. After EC2 reboot, Docker should restart the Compose project if configured with restart policies (already set per service). Verify:

```bash
sudo reboot
# after reconnect:
docker compose ps
curl -fsS https://<DOMAIN>/healthz
```

Caddy certs persist in volume `caddy_data`. Redis is ephemeral — in-flight link tokens may need re-issue.

## Rollback

1. `git checkout <previous-known-good-sha>`
2. Rebuild/retag previous images (or `docker compose up -d` with prior tags)
3. Re-run migrate **only** if the older revision requires it (prefer forward-fix migrations; avoid destructive downs on production)
4. `docker compose up -d`
5. Confirm `/healthz` and bot `/stats`

## Backup / recovery considerations

- **Postgres:** rely on Supabase backups / PITR per project plan; do not treat Redis as durable.
- **Caddy:** `caddy_data` volume holds certs — back up if replacing the instance without DNS cutover time.
- **Secrets:** keep an offline copy of `.env` (password manager); rotate `AGENT_API_KEY` / `ADMIN_API_TOKEN` if leaked.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| API exits immediately in production | `AGENT_API_KEY` / `ADMIN_API_TOKEN` set? Fail-closed boot |
| `401 UNAUTHORIZED` from capture agent | `X-Agent-Key` matches `AGENT_API_KEY`; `API_BASE_URL` has trailing `/api/` |
| Bot cannot reach API | Bot `API_BASE_URL=http://api:7871/api/`; both on `ledger` network |
| `/api/stats` 404 via public HTTPS | Expected — Caddy deny; bot must use internal API |
| Linking tokens vanish after Redis restart | Expected for ephemeral Redis v1 |
| `/readyz` 503, `/healthz` 200 | DB or Redis blip; do not panic-restart on readiness alone |
| TLS fails | DNS → instance; ports 80/443 open; `DOMAIN` matches cert name |

## Workstream B acceptance (not claimed by Workstream A)

- [ ] Laptop off; `GET https://<domain>/healthz` OK
- [ ] Bot `/stats` for linked user
- [ ] Worker processes ingest against production Supabase (agent or curated HTTPS curl with agent key)
- [ ] EC2 reboot recovery verified
- [ ] Billing alarms on; cost checklist done
