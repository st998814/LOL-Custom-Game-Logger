# Plan — Host application + bot on AWS (EC2 + Compose)

**Steven** — Nov 18, 2026  
**Status:** Accepted for implementation planning  
**Decision:** [DEC-004](../../05-knowledge/Decisions.md#dec-004--production-hosting-aws-ec2--compose)  
**Requirement:** `REQ-OPS-05` in [UserStories.md](../../00-product/UserStories.md)

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
| AWS EC2 + Docker Compose       | Single small instance                      |
| Caddy                          | TLS termination + reverse proxy to API     |
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
| `REQ-ACC-08` agent key as a hard gate for this slice | Ship with hosted bot/API first; tighten agent-facing routes when remote capture is opened |
| Multi-AZ, autoscaling, app-store distribution | Not needed for friend-group scale |

---

## 3. Target topology

```
Internet
   │  HTTPS :443
   ▼
┌──────────────────────────────────────────┐
│  EC2 (t3.micro / t4g.micro)              │
│                                          │
│  Caddy ──► api :7871                     │
│            worker (no published ports)   │
│            bot ──► http://api:7871/api/  │
└──────────────────────┬───────────────────┘
                       │ DATABASE_URL (api + worker only)
                       ▼
                 Supabase PostgreSQL
```

| Process | Image / build | Network |
|---------|---------------|---------|
| `api` | `server/` Dockerfile, `npm start` | Internal; Caddy proxies `:443` → `api:7871` |
| `worker` | Same image, `npm run worker` | No publish |
| `bot` | `frontend/bot/` Dockerfile | Outbound to Telegram + `http://api:7871` |
| `caddy` | Official Caddy image | Host `:443` (and `:80` for ACME) |

Architectural rules unchanged: bot never holds `DATABASE_URL`; capture agent (when used) only POSTs to the application HTTP API.

---

## 4. AWS choices (locked)

| Choice | Value |
|--------|--------|
| Compute | **EC2** + **Docker Compose** (not Lightsail for v1 — better cert/interview signal) |
| Size | `t3.micro` or `t4g.micro`, ~20–30 GB gp3 |
| Region | Single region only |
| Exposure | Public **HTTPS**; do **not** publish host port `7871` |
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
| `DATABASE_URL`, `DIRECT_URL` | `api`, `worker` only |
| `TG_BOT_API_TOKEN` | `bot` only |
| API base for bot | `http://api:7871/api/` (Docker DNS) |

Store via Compose `env_file` on the instance (or SSM Parameter Store as a stretch). Never commit secrets. Run `prisma migrate deploy` as a one-shot at deploy time, not on every worker restart.

---

## 6. Implementation checklist

Work is complete for `REQ-OPS-05` when the checklist is done and verified.

### Repo

- [ ] `server/Dockerfile` (Node 20+; shared by api + worker)
- [ ] `frontend/bot/Dockerfile` (Python 3.12+)
- [ ] Root `docker-compose.yml` (`api`, `worker`, `bot`, `caddy`)
- [ ] `Caddyfile` (or equivalent) for TLS + proxy to `api:7871`
- [ ] `.env.example` files documenting required vars (no secrets)
- [ ] Deploy / ops notes linked from [Runbooks.md](../../05-knowledge/Runbooks.md)

### AWS

- [ ] IAM principal for admin (not root for daily use)
- [ ] EC2 instance + security group (`443` public, `22` locked)
- [ ] DNS → instance
- [ ] Billing alarms enabled
- [ ] Compose stack `up` and surviving reboot (`restart` policies)

### Verify

- [ ] `GET https://<domain>/` (or health path) succeeds with laptop off
- [ ] Bot answers `/stats` for a linked allowlisted user
- [ ] Worker still processes a `MATCH_SNAPSHOT` when ingest is exercised (laptop agent or curated curl against HTTPS — agent packaging not required)
- [ ] Bot container has no `DATABASE_URL`

---

## 7. Capture agent (explicit deferral)

The host capture agent remains a **dev / local** tool for this plan:

- Operators may still run `capture_agent/` against the public HTTPS API for dogfood.
- **Do not** block this plan on Windows/macOS installers, agent UI, or downloadable packages.
- When agent distribution is planned later, revisit `REQ-ACC-08` (shared `X-Agent-Key` on agent-facing routes) because ingest will already be on the public internet.

---

## 8. Related docs

| Doc | Update |
|-----|--------|
| [DEC-004](../../05-knowledge/Decisions.md#dec-004--production-hosting-aws-ec2--compose) | Locked topology |
| [UserStories.md](../../00-product/UserStories.md) | `REQ-OPS-05` |
| [Roadmap.md](../../00-product/Roadmap.md) | Post-MVP hosting bullet |
| [Runbooks.md](../../05-knowledge/Runbooks.md) | MVP vs production pointer |
| [SystemArchitecture.md](../../01-architecture/SystemArchitecture.md) | Production deploy note |
