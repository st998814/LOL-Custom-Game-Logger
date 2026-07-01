# Publish PR Examples

## Example 1 — Complete (thin PR, verification + docs)

**Context:** Issue #12 `REQ-CAP-01`, bootstrap exists, needs README + manual smoke.

**Title:** `REQ-CAP-01: Document host capture workflow`

**Body:**

```md
## Requirements

- [REQ-CAP-01](docs/00-product/UserStories.md#duel-capture)
- Closes #12

## Summary

Documents how the host runs the LCU client while League is open. No behavioral change to the capture loop.

## What changed

- Added "Host workflow" section to `client/README.md`
- Clarified READY-state log message in `client/main.py`

## Verification

| Check | Command | Result |
|-------|---------|--------|
| Lint | N/A | N/A |
| Tests | N/A | N/A |
| Manual smoke | League 14.x, macOS | Pass |

### Manual smoke

1. League client open on host machine
2. Run `uv run python main.py` from `client/`
3. Client bootstraps to READY within ~10s
4. Log shows "Ready for logging the match.."

## Acceptance criteria

- [x] Host can start client while League is running and reach READY
- [x] README documents host workflow
- [x] Manual smoke recorded above

## Risks

- None

## Notes for reviewer

- REQ-CAP-02 (credential errors when League closed) tracked separately
```

**Command:**

```bash
git push -u origin HEAD
gh pr create --title "REQ-CAP-01: Document host capture workflow" --body "$(cat <<'EOF'
[paste body]
EOF
)"
```

---

## Example 2 — Implement (code + tests)

**Context:** Issue #15 `REQ-CAP-04`, add 2-player validation.

**Title:** `REQ-CAP-04: Validate 2-player duel before send`

**Body:**

```md
## Requirements

- REQ-CAP-04
- Closes #15

## Summary

Rejects match snapshots when `participantIdentities.length !== 2` before POSTing to the server.

## What changed

- Validation in `client/main.py` before `send_payload`
- Unit tests with 2-player and 5-player fixtures

## Verification

| Check | Command | Result |
|-------|---------|--------|
| Tests | `cd client && uv run pytest` | Pass |

## Acceptance criteria

- [x] 2-player fixture → payload sent
- [x] 5-player fixture → rejected, no POST
- [x] Rejection logged with player count

## Risks

- Custom game modes with empty identities need follow-up if seen in dogfood

## Notes for reviewer

- Fixture paths under `client/tests/fixtures/`
```

---

## Example 3 — Vertical slice (multiple REQ IDs)

**Title:** `M1: Ingest path — client send, server queue, worker persist`

**Body:**

```md
## Requirements

- REQ-CAP-05
- REQ-SRV-01
- REQ-SRV-02
- Closes #20

## Summary

End-to-end ingest: client POSTs `MATCH_SNAPSHOT`, server queues raw event, worker writes Match/MatchPlayer rows.

## What changed

- Integration test POSTing `client/data/seed/payload.json`
- Worker processing fixes (if any)

## Verification

| Check | Command | Result |
|-------|---------|--------|
| Tests | `cd server && npm test` | Pass |
| Integration | POST + worker poll | Pass |

## Acceptance criteria

- [x] RawEvent created with PENDING status
- [x] Worker produces Match + 2 MatchPlayer rows
- [x] Duplicate POST does not duplicate match (REQ-SRV-06 follow-up if not in scope)

## Notes for reviewer

- Primary traceability ID in title is slice label; all REQ IDs listed above
```

---

## Example 4 — Draft WIP PR (verification incomplete)

Only when the user explicitly requests early feedback:

```bash
gh pr create --draft --title "REQ-CAP-03: WIP match snapshot collection" --body "..."
```

Mark Verification table with Fail or Pending and list remaining work in Notes for reviewer.
