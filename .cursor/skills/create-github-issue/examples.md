# GitHub Issue Examples

## Example 1 — Complete (code exists, needs verification)

**User request:** "Create an issue for REQ-CAP-01 — client mostly works"

**Title:** `REQ-CAP-01: Verify and document host capture workflow`

**Body:**

```md
## Requirement

- **ID:** REQ-CAP-01
- **Epic:** US-1
- **Priority:** P0
- **Source:** [UserStories — Duel capture](docs/00-product/UserStories.md#duel-capture)
- **Type:** Complete

## Summary

Host duelist runs the LCU client on their PC while the League client is open. Only the host needs the tool per session.

## Current state

- [x] `client/main.py` bootstrap + run loop exists
- [ ] README host instructions
- [ ] Manual smoke recorded
- [ ] Acceptance criteria checked off

## Remaining gap

- Document run procedure
- Confirm one successful host session (League open, client reaches READY)

## Acceptance criteria

- [ ] Host can start client while League is running and reach READY state
- [ ] README documents host workflow and prerequisites
- [ ] Manual smoke result recorded in PR

## Affected modules

- [x] `client/main.py`
- [x] `client/README.md` or project README

## Test plan

| Scenario | Type | Expected |
|----------|------|----------|
| League open, run client | Manual | Bootstraps to READY |
| League not running | Manual | Clear error (see REQ-CAP-02) |

## Links

- Roadmap milestone: M1
```

---

## Example 2 — Implement (behavior missing)

**User request:** "Create an issue for 2-player validation"

**User request:** "Create an issue for 2-player validation"

**Title:** `REQ-CAP-04: Validate 2-player duel before send`

**Body:**

```md
## Requirement

- **ID:** REQ-CAP-04
- **Epic:** US-1
- **Priority:** P0
- **Source:** [UserStories — Duel capture](docs/00-product/UserStories.md#duel-capture)
- **Type:** Implement

## Summary

Client validates the game is a 2-player duel before sending. Reject if `participantIdentities.length ≠ 2`.

## Current state

- [x] `client/data/parser.py` reads `participantIdentities`
- [ ] Validation before send
- [ ] Tests for 2-player vs non-2-player fixtures
- [ ] Acceptance criteria checked off

## Remaining gap

- Add participant count check before POST
- Reject and log when `participantIdentities.length !== 2`
- Unit tests with fixtures

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

## Example 3 — Vertical slice (multiple requirements)

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

## Example 4 — Bug without a requirement row

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
