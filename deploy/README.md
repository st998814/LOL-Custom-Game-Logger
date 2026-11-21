# Deploy artifacts (Caddy + Compose)

## Caddyfile

[`Caddyfile`](./Caddyfile) terminates TLS and reverse-proxies **only** the public allowlist to `api:7871`.

| Public (via Caddy) | Not public (404 at edge) |
|--------------------|---------------------------|
| `GET /healthz`, `GET /readyz` | `GET /` |
| `POST /api/events` | `/api/admin/*` |
| `GET /api/user/status` | `/api/stats`, `/api/stats/*` |
| `POST /api/user/link` | `POST /api/user/link/complete` |
| `POST /api/user/register/link` (deprecated) | `POST /api/user/register/link/complete` |

Bot traffic uses Docker DNS `http://api:7871/api/` and never needs these paths on the public hostname.

Compose injects `DOMAIN` (see root `docker-compose.yml`). Ports **80** (ACME HTTP-01 + redirect) and **443** are published; API `7871` is not.

## Validate configuration

From the repo root (does not need the full stack up):

```bash
docker run --rm \
  -e DOMAIN=ledger.example.com \
  -v "$PWD/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.8.4-alpine \
  caddy validate --config /etc/caddy/Caddyfile
```

Or via Compose (starts a one-shot caddy container on the project network):

```bash
DOMAIN=ledger.example.com docker compose run --rm --no-deps caddy \
  caddy validate --config /etc/caddy/Caddyfile
```

Expect: `Valid configuration`.

## Local notes

- `DOMAIN=localhost` uses Caddy’s local/automatic HTTPS behaviour; for a real public host, set DNS A/AAAA to the EC2 instance first (Workstream B).
- Certificate state persists in the Compose volume `caddy_data`.
