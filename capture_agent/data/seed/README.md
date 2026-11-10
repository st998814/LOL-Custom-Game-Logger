# Seed fixtures (dogfood)

Fixtures for exercising the **real** ingest → worker → ledger path without grinding 50 customs.

| Path | Purpose |
|------|---------|
| `payload.json` | Single reference `MATCH_SNAPSHOT` (smoke / unit tests) |
| `corpus/001.json` … `050.json` | 50-match dogfood corpus (`game_id` `910000001`–`910000050`) |
| `EXPECTED.md` | Evidence mix + expected W–L after a clean load |
| `generate_corpus.py` | Regenerates `corpus/` + `EXPECTED.md` |
| `load_corpus.sh` | POSTs every corpus file to `POST /api/events` |

## Prerequisites

1. Application API listening (local default `http://127.0.0.1:7871`).
2. **Worker running** (`npm run worker` in `server/`) so `PENDING` raw events become `Match` / `MatchPlayer` rows.
3. Do **not** insert corpus rows into `matches` via Prisma — load only through HTTP ingest.

## Load the 50-match corpus

From repo root (or this directory):

```bash
./capture_agent/data/seed/load_corpus.sh
# optional override:
# BASE_URL=http://127.0.0.1:7871 ./capture_agent/data/seed/load_corpus.sh
```

- First clean load: expect **50× `202`**, then worker catch-up → 50 ledger matches.
- Re-load of the same set: expect **50× `409 DUPLICATE_SNAPSHOT`** (idempotent; no duplicate matches).
- Any other HTTP status → script exits non-zero.

After load, compare W–L / evidence mix to [EXPECTED.md](./EXPECTED.md).

## Regenerate fixtures

```bash
cd capture_agent/data/seed
python3 generate_corpus.py
```

Commit regenerated `corpus/*.json` and `EXPECTED.md` together with generator changes.

## Querying stats after load

Ledger rows are keyed by PUUID. Bot `/stats*` and `GET /api/stats*?tgId=` require a **linked Telegram `tgId`** ([DEC-002](../../../docs/05-knowledge/Decisions.md#dec-002--stats-query-identity-is-telegram-tgid)).

- Link a roster player (capture-agent QR → `/start <token>`), **or**
- Set `players.tg_id` for a seed PUUID in a local DB, then curl / bot as that Telegram user.

Until linked, ingest + worker still lodge matches; only the presentation/stats identity path is blocked.
