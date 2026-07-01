# REQ-CAP-01 — Manual smoke verification

Host capture bootstrap: League open → client start → READY state.

## Environment

| Field | Value |
|-------|-------|
| Date | 2026-07-01 |
| OS | macOS (darwin 25.3.0) |
| Requirement | [REQ-CAP-01](../../00-product/UserStories.md#duel-capture) |
| Issue | [#4](https://github.com/st998814/LOL-Custom-Game-Logger/issues/4) |
| Branch | `req-cap-01-host-workflow` |

## Steps

1. Open League of Legends client and log in (host machine).
2. From repository: `cd client && uv run python main.py`
3. Observe bootstrap logs through READY.
4. Confirm recurring `Ready for logging the match..` while idle (no game in progress).

## Result

**Pass** — Client bootstrapped successfully and reached READY within ~3 seconds.

## Redacted log excerpt

Summoner name, PUUID, and tag line removed.

```
2026-07-01 21:55:04,544 INFO __main__ - Welcome to the LCU side-client
2026-07-01 21:55:04,544 INFO __main__ - Building Connection...
2026-07-01 21:55:04,544 INFO __main__ - Validating connection...
2026-07-01 21:55:06,563 INFO lcu.agent - Welcome <summoner name>
2026-07-01 21:55:06,563 INFO __main__ - LCU connection OK.
2026-07-01 21:55:06,563 INFO __main__ - The client has been bootstrapped successfully
2026-07-01 21:55:07,564 INFO __main__ - Ready for logging the match..
2026-07-01 21:55:08,573 INFO lcu.agent - Waiting for the match start
```

## Acceptance criteria mapping

| Criterion | Status |
|-----------|--------|
| Host can start client with League running and reach READY | Pass |
| README documents host workflow | Covered by `client/README.md` (separate doc change) |
| Manual smoke recorded for PR | This file |

## Notes

- League state at test time: client open, logged in, no custom game in progress.
- `Waiting for the match start` is expected idle behavior before a custom 1v1 begins.
- Negative path (League not running → credential parse error) not exercised in this session; tracked under REQ-CAP-02.
