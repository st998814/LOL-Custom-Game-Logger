# LCU Client — Host Capture Runbook

Semi-automated runbook for **REQ-CAP-01**: the host duelist runs this client on their PC while the League client is open. The client handles LCU discovery, bootstrap, and match capture automatically after you start it.

## Who runs this

| Role | Action |
|------|--------|
| **Host** (custom game creator) | Install and run this client on the same PC as League |
| **Opponent** | Nothing — join the custom game normally |

Only **one** player runs the tool per session.

## Prerequisites

- **League of Legends client** open and logged in on the host machine (start League *before* the capture client)
- **Python 3.12+** (see [`.python-version`](.python-version))
- **[uv](https://docs.astral.sh/uv/)** package manager
- **macOS** — credential discovery uses `ps axww` to read LCU port/token from the League process
- **Server ingest** reachable at `http://127.0.0.1:7871/api/events` when sending match data (local dev default)

## Install

From the repository root:

```bash
cd client
uv sync
```

## Start (operator)

1. Open the League client and log in.
2. From the `client/` directory:

```bash
uv run python main.py
```

3. Confirm bootstrap logs (see below). Leave the terminal open for the duration of your custom 1v1.
4. Host the custom game as usual. When the game ends, the client captures and sends the match snapshot automatically.
5. Stop the client with `Ctrl+C` when you are done hosting for the session.

Optional: increase log verbosity:

```bash
LOG_LEVEL=DEBUG uv run python main.py
```

## Expected logs

### Bootstrap (healthy)

After start, you should see a sequence like:

```
INFO __main__ - Welcome to the LCU side-client
INFO __main__ - Building Connection...
INFO __main__ - Validating connection...
INFO lcu.agent - Welcome <summoner name>
INFO __main__ - LCU connection OK.
INFO __main__ - The client has been bootstrapped successfully
INFO __main__ - Ready for logging the match..
```

The client then repeats `Ready for logging the match..` while waiting for a game.

### During a match

When a custom game is in progress and completes:

```
INFO lcu.agent - Waiting for the match start
INFO lcu.agent - Game ID : <id>
INFO lcu.agent - Waiting for the match completion
INFO lcu.agent - Match data fetched successfully
INFO __main__ - Match payload sent successfully: ...
```

If LCU match-history is slow to populate, the client retries up to 5 times (3 seconds apart) before logging a recoverable error and returning to **READY** for the next game.

## Automated behavior

Once you run `uv run python main.py`, the client handles these steps without further operator action:

| Step | What happens |
|------|----------------|
| Credential discovery | Reads LCU `--app-port` and `--remoting-auth-token` from the running League process |
| Bootstrap | Connects to LCU, validates summoner info, reaches **READY** (up to 5 retries on transient errors) |
| Poll loop | Waits for game start, waits for `WaitingForStats`, fetches match-history snapshot |
| Duel validation | Rejects snapshots unless `participants` and `participantIdentities` are both length 2 and aligned |
| Transform | Builds a `MATCH_SNAPSHOT` payload from LCU data |
| Send | POSTs the payload to the server ingest endpoint |

## Troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| `LCU credential discovery failed` (critical) | League client not running or LCU credentials unavailable | Open League, log in, restart the capture client |
| `LCU request failed during bootstrap` (warning, retries) | LCU not ready yet | Wait a few seconds; client retries up to 5 times |
| `App is terminated , please restart the app` (fatal) | Bootstrap exhausted all retries | Restart League if needed, then rerun the client |
| `Failed to send payload to backend` | Server not running, wrong URL, or HTTP error from ingest | Start the server stack; default ingest is `http://127.0.0.1:7871/api/events`. Client enters **FAILED** — restart the capture client after fixing the server |
| `Waiting for the match start` (no capture) | No custom game in progress | Host or join a custom 1v1; client captures after game end |
| `Failed to collect match snapshot` (error) | LCU match-history empty after game end | Client returns to **READY** automatically; no restart needed. If this repeats, check League client state or retry after the next game |
| `Skipping non-duel match snapshot` (warning) | Game was not a 2-player custom (e.g. larger lobby) | Expected for non-1v1 games; client skips POST and stays **READY** for the next game |

## Related requirements

- **REQ-CAP-02** — LCU port/token resolution and clear error when League is not running
- **REQ-CAP-03** — Game-end match snapshot collection (`WaitingForStats` → LCU match-history)
- **REQ-CAP-04** — Validate 2-player duel before send
- **REQ-CAP-05** — Send snapshot to server as a raw event
