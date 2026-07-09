# Troubleshooting

Cross-tier issues when running the local stack. For component-specific tables, see the linked runbooks.

## Quick index

| Symptom | See |
|---------|-----|
| Full stack bootstrap | [playbooks/dev-bootstrap.md](playbooks/dev-bootstrap.md) |
| `P1000`, migrations, Supabase frozen | [Database.md](../01-architecture/Database.md) |
| Server won't start, ingest fails | [server/README.md](../../server/README.md) |
| Bot token / polling | [frontend/bot/README.md](../../frontend/bot/README.md) |
| LCU capture, send failures | [client/README.md](../../client/README.md) |

## Common cross-tier failures

### Ingest works but matches never appear

1. Confirm worker is running: `cd server && npm run worker`
2. Check `raw_events` in Prisma Studio — status should move from `PENDING` to `PROCESSED` or `FAILED`
3. If `FAILED`, read `error_message` on the row

### Client cannot POST to server

1. API must be up: `curl http://127.0.0.1:7871/`
2. Default ingest URL: `http://127.0.0.1:7871/api/events`
3. Restart LCU client after fixing server

### Fresh clone — nothing connects to DB

1. Create `server/.env` with `DATABASE_URL` and `DIRECT_URL`
2. `cd server && npx prisma generate && npx prisma migrate deploy`
