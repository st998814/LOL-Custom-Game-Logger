# Plan — Host application + bot on AWS (EC2 + Compose)

**Steven** — Nov 18, 2026  
**Status:** Accepted — **Workstream A (repo) complete**; Workstream B (live AWS) pending  
**Decision:** [DEC-004](../../05-knowledge/Decisions.md#dec-004--production-hosting-aws-ec2--compose) (amended: Redis + agent API key)  
**Requirement:** `REQ-OPS-05` in [UserStories.md](../../00-product/UserStories.md)  
**Issue:** [#52](https://github.com/st998814/LOL-Custom-Game-Logger/issues/52)  
**Operator playbook:** [aws-ec2-compose-deploy.md](../../05-knowledge/playbooks/aws-ec2-compose-deploy.md)

---

## 1. Goal

Run the **application tier** (Express API + raw-event worker) and **presentation tier** (Telegram bot) as an **always-on** stack on AWS so the duel group can query `/stats` without an operator laptop. Data stays on **Supabase**. Match data remains LCU-sourced only.

**Success:** Telegram `/stats` works while the operator’s laptop is off; public HTTPS reaches the API; worker processes events against Supabase.

---

## 2. Scope

### In scope

| Piece                          | Role                                       |
| ------------------------------ | ------------------------------------------ |
| Express API                    | Ingest + read APIs behind public HTTPS     |
| Raw-event worker               | Always-on; same host/image as API          |
| Telegram bot                   | Always-on; calls API on the Docker network |
| Redis                          | Internal; temporary Telegram linking tokens |
| AWS EC2 + Docker Compose       | Single small instance                      |
| Caddy                          | TLS termination + allowlisted reverse proxy |
| Supabase Postgres              | Existing data tier (unchanged)             |
| Billing alarm + credit hygiene | Protect free-plan / credit budget          |

### Out of scope (this plan)

| Deferred item | Why |
|---------------|-----|
| Capture agent packaging / download UX | No solid agent UI yet; Win/macOS distribution not designed |
| Cross-platform agent installers | Separate “agent distribution” plan later |
| Tailscale / private-only ingest | Group chose **public HTTPS** for the API |
| ECS Fargate, EKS, App Runner, Lambda | Overkill; burns credits; weak fit for long-lived worker + bot |
| Amazon RDS | Supabase already hosts Postgres |
| ALB + ACM (v1) | Prefer TLS on-box (Caddy) to save cost; optional later |
| Multi-AZ, autoscaling, app-store distribution | Not needed for friend-group scale |
| OAuth / per-player API keys | Minimal shared `X-Agent-Key` only ([DEC-004](../../05-knowledge/Decisions.md#dec-004--production-hosting-aws-ec2--compose)) |

---

## 3. Target topology

```
Internet
   │  HTTPS :443
   ▼
┌──────────────────────────────────────────┐
│  EC2 (t3.micro / t4g.micro)              │
│                                          │
│  Caddy ──► api :7871  (allowlisted)      │
│            worker (no published ports)   │
│            bot ──► http://api:7871/api/  │
│            redis (internal; linking TTL) │
└──────────────────────┬───────────────────┘
                       │ DATABASE_URL (api + worker only)
                       ▼
                 Supabase PostgreSQL
```

| Process | Image / build | Network |
|---------|---------------|---------|
| `api` | `server/` Dockerfile, `npm start` | Internal; Caddy → `api:7871` |
| `worker` | Same image, `npm run worker` | No publish; Postgres queue |
| `bot` | `frontend/bot/` Dockerfile | Outbound Telegram + `http://api:7871` |
| `redis` | `redis:7.2.5-alpine` | Internal only; **no** host `6379` |
| `caddy` | `caddy:2.8.4-alpine` | Host `:443` / `:80` |
| `migrate` | Same Server image (Compose profile) | One-shot `prisma migrate deploy` |

Architectural rules unchanged: bot never holds `DATABASE_URL`; capture agent only POSTs to the application HTTP API (with `X-Agent-Key` in production).

---

## 4. AWS choices (locked)

| Choice | Value |
|--------|--------|
| Compute | **EC2** + **Docker Compose** (not Lightsail for v1 — better cert/interview signal) |
| Size | `t3.micro` or `t4g.micro`, ~20–30 GB gp3 |
| Region | Single region only |
| Exposure | Public **HTTPS**; do **not** publish host ports `7871` or `6379` |
| SSH | Port `22` from operator IP only |
| IAM | Deploy with IAM user/role; do not daily-drive root |
| DNS | Domain A/AAAA → instance (Route 53 or external DNS) |
| TLS | Caddy automatic HTTPS (Let’s Encrypt) |
| DB | Existing Supabase `DATABASE_URL` / `DIRECT_URL` |

### Credit / free-plan hygiene

- Create **billing alarms** (e.g. $5 and $10) before leaving resources running.
- No ALB, NAT gateway, or RDS in v1.
- Avoid orphan EBS volumes and idle Elastic IPs.
- One region, one instance.

---

## 5. Secrets and env

| Variable | Who gets it |
|----------|-------------|
| `DATABASE_URL` | `api`, `worker` |
| `DIRECT_URL` | **migrate profile only** |
| `REDIS_URL` | `api` (Compose: `redis://redis:6379`) |
| `AGENT_API_KEY`, `ADMIN_API_TOKEN` | `api` (fail-closed in production) |
| `TG_BOT_API_TOKEN` | `bot` only |
| `DOMAIN` | `caddy` |
| API base for bot | `http://api:7871/api/` (Docker DNS) |

Templates: [`.env.example`](../../../.env.example). Never commit secrets. Run `prisma migrate deploy` as a one-shot profile job, not on every worker restart.

---

## 6. Implementation checklist

### Workstream A — Repository (complete)

- [x] `server/Dockerfile` (shared by api + worker)
- [x] `frontend/bot/Dockerfile`
- [x] Root `docker-compose.yml` (`api`, `worker`, `bot`, `caddy`, `redis` + migrate profile)
- [x] `deploy/Caddyfile` TLS + public allowlist
- [x] `.env.example` / `server/.env.example` (no secrets)
- [x] Auth boundary, health probes, worker reclaim
- [x] Deploy / ops notes + [Workstream A verification](../verification/REQ-OPS-05-workstream-a-verification.md)

### Workstream B — AWS (pending)

- [ ] IAM principal for admin (not root for daily use)
- [ ] EC2 instance + security group (`443`/`80` public, `22` locked; no `7871`/`6379`)
- [ ] DNS → instance
- [ ] Billing alarms enabled
- [ ] Compose stack `up` and surviving reboot
- [ ] Laptop-off: `GET https://<domain>/healthz`
- [ ] Bot `/stats` for a linked user
- [ ] Worker processes ingest against production Supabase
- [ ] Bot container has no `DATABASE_URL`

Follow [aws-ec2-compose-deploy.md](../../05-knowledge/playbooks/aws-ec2-compose-deploy.md).

---

## 7. Capture agent (explicit deferral)

The host capture agent remains a **dev / local** tool for packaging:

- Operators may run `capture_agent/` against the public HTTPS API with `AGENT_API_KEY` / `X-Agent-Key`.
- **Do not** block hosting on Windows/macOS installers or downloadable packages.
- Shared agent key for production HTTPS is already in DEC-004; full `REQ-ACC-08` product Done (packaging/distribution) remains separate.

---

## 8. Related docs

| Doc | Update |
|-----|--------|
| [DEC-004](../../05-knowledge/Decisions.md#dec-004--production-hosting-aws-ec2--compose) | Locked topology + Redis/auth amendments |
| [UserStories.md](../../00-product/UserStories.md) | `REQ-OPS-05` |
| [Roadmap.md](../../00-product/Roadmap.md) | Post-MVP hosting bullet |
| [Runbooks.md](../../05-knowledge/Runbooks.md) | MVP vs production five-service stack |
| [SystemArchitecture.md](../../01-architecture/SystemArchitecture.md) | Production deploy note |
| [aws-ec2-compose-deploy.md](../../05-knowledge/playbooks/aws-ec2-compose-deploy.md) | Operator procedures |
