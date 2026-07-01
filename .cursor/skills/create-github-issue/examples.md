# GitHub Issue Examples

## Example 1 — Single P0 requirement

**User request:** "Create an issue for 2-player validation"

**Title:** `REQ-CAP-04: Validate 2-player duel before send`

**Body:**

```md
## Requirement

- **ID:** REQ-CAP-04
- **Epic:** US-1
- **Priority:** P0
- **Source:** [UserStories — Duel capture](docs/00-product/UserStories.md#duel-capture)

## Summary

Client validates the game is a 2-player duel before sending. Reject if `participantIdentities.length ≠ 2`.

## Acceptance criteria

- [ ] When `participantIdentities.length === 2`, client packs and sends `MATCH_SNAPSHOT`
- [ ] When `participantIdentities.length !== 2`, client does not POST to server
- [ ] Rejection is logged with a clear reason (player count)

## Affected modules

- [x] `client/data/parser.py` or validation layer before send
- [ ] `server/`

## Test plan

| Scenario | Type | Expected |
|----------|------|----------|
| 2-player LCU fixture | Unit | Payload produced |
| 5-player LCU fixture | Unit | Rejected, no send |

## Links

- Roadmap milestone: M2
```

**Command:**

```bash
gh issue create \
  --title "REQ-CAP-04: Validate 2-player duel before send" \
  --label "P0" --label "area:capture" \
  --body "$(cat <<'EOF'
[paste body]
EOF
)"
```

---

## Example 2 — Vertical slice (multiple requirements)

**Title:** `M1: Ingest path — client send + server queue + worker persist`

**Body lists primary IDs:**

```md
## Requirements

- **REQ-CAP-05** — Client sends match snapshot as raw event
- **REQ-SRV-01** — Server accepts and queues raw events
- **REQ-SRV-02** — Worker persists MATCH_SNAPSHOT to PostgreSQL

## Acceptance criteria

- [ ] POST `/api/events` returns success; `RawEvent` row is PENDING
- [ ] Worker processes event; `Match` + `MatchPlayer` rows exist
- [ ] Uses fixture from `client/data/seed/payload.json` in integration test

## Links

- Roadmap milestone: M1
```

Use one issue for the slice; PR still lists each `REQ-*` in its Requirements section.

---

## Example 3 — Bug without a requirement row

**Title:** `BUG: Worker retries exhausted events without backoff`

**Body:**

```md
## Requirement

- **Related:** REQ-OPS-02 (worker retries)
- **Type:** Bug — not a new product requirement

## Summary

Failed raw events retry immediately with no delay, hammering DB on bad payloads.

## Acceptance criteria

- [ ] Retry uses bounded backoff or poll interval
- [ ] After MAX_RETRIES, event status is FAILED with error message
```

No `REQ-*` in title; link related requirement in body.
