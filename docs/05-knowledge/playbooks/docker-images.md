# Docker images — build notes (REQ-OPS-05 Workstream A)

Shared Server image for API + worker; separate bot image. Used by the Compose stack (A6+).

## Build

```bash
# From repo root
docker build -t lol-ledger-server:local ./server
docker build -f frontend/bot/Dockerfile -t lol-ledger-bot:local ./frontend
```

| Image | Context | Default command | Override |
|-------|---------|-----------------|----------|
| `lol-ledger-server` | `server/` | `npm start` (API) | `npm run worker` |
| `lol-ledger-bot` | `frontend/` (`-f frontend/bot/Dockerfile`) | `python main.py` | — |

## Prisma 7 + TypeScript runtime

- Client is generated at **image build** (`npx prisma generate`) with a dummy `DIRECT_URL` (config requires the var; no DB contact).
- Runtime still needs **`tsx`** (`npm start` / `npm run worker`) and keeps the **Prisma CLI** for one-shot `prisma migrate deploy` jobs.
- Do **not** assume `npm ci --omit=dev` alone is enough for this repo.

## ARM64 vs AMD64

| Host | Typical AWS size | Notes |
|------|------------------|-------|
| **AMD64** (`linux/amd64`) | `t3.micro` | Default Docker Desktop on Intel Macs; most GitHub-hosted runners |
| **ARM64** (`linux/arm64`) | `t4g.micro` | Apple Silicon Docker Desktop default; build native ARM images or cross-build |

Constraints:

- Build on the **same architecture** as the EC2 instance when possible (`docker build` without `--platform`).
- Cross-building (e.g. ARM laptop → AMD64 EC2):  
  `docker build --platform linux/amd64 -t lol-ledger-server:local ./server`  
  Requires buildx/QEMU; slower; prefer matching arch for MVP.
- Redis/Caddy official images publish multi-arch manifests; pin versions in Compose (A6) and pull the digest that matches the host.
- Node/Python base tags above (`node:20-bookworm-slim`, `python:3.12-slim`) are multi-arch; still verify with `docker image inspect` / `uname -m` on the instance before first deploy.

## Non-root

Both images run as UID `10001` (`appuser`). Do not bake secrets into the image; inject env at runtime (Compose / instance env files).
