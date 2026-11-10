#!/usr/bin/env python3
"""Generate 50 DEC-001-valid MATCH_SNAPSHOT fixtures for dogfood seeding.

Writes corpus/001.json … corpus/050.json and EXPECTED.md next to this script.
Re-run to regenerate committed output.
"""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

SEED_DIR = Path(__file__).resolve().parent
CORPUS_DIR = SEED_DIR / "corpus"
EXPECTED_PATH = SEED_DIR / "EXPECTED.md"

CORPUS_SIZE = 50
GAME_ID_BASE = 910_000_000
CS_WIN_THRESHOLD = 100

CHAMPION_IDS = (54, 82, 157, 266, 222, 64, 103, 235)


@dataclass(frozen=True)
class RosterPlayer:
    key: str
    puuid: str
    game_name: str
    tag_line: str


ROSTER: tuple[RosterPlayer, ...] = (
    RosterPlayer(
        key="night",
        puuid="47842bcd-35c8-5a94-b368-2d4aa6867e95",
        game_name="安官桌的夜點",
        tag_line="5715",
    ),
    RosterPlayer(
        key="neverland",
        puuid="333b88e5-36d7-558e-9084-b5afd88a5776",
        game_name="NeverLand",
        tag_line="yugi",
    ),
    RosterPlayer(
        key="alpha",
        puuid="a1111111-1111-4111-8111-111111111111",
        game_name="DogfoodAlpha",
        tag_line="seed",
    ),
    RosterPlayer(
        key="beta",
        puuid="b2222222-2222-4222-8222-222222222222",
        game_name="DogfoodBeta",
        tag_line="seed",
    ),
)

# All unordered pairings of the 4-player roster, rotated across matches.
PAIRINGS: tuple[tuple[RosterPlayer, RosterPlayer], ...] = (
    (ROSTER[0], ROSTER[1]),
    (ROSTER[0], ROSTER[2]),
    (ROSTER[0], ROSTER[3]),
    (ROSTER[1], ROSTER[2]),
    (ROSTER[1], ROSTER[3]),
    (ROSTER[2], ROSTER[3]),
)


def evidence_kind(index: int) -> str:
    """1-based index → fb (1-17), ft (18-34), cs (35-50)."""
    if index <= 17:
        return "fb"
    if index <= 34:
        return "ft"
    return "cs"


def qualifies(first_blood: bool, first_tower: bool, total_cs: int) -> bool:
    return first_blood or first_tower or total_cs >= CS_WIN_THRESHOLD


def build_player(
    roster: RosterPlayer,
    *,
    team_id: int,
    participant_id: int,
    champion_id: int,
    first_blood: bool,
    first_tower: bool,
    total_cs: int,
) -> dict:
    return {
        "puuid": roster.puuid,
        "team_id": team_id,
        "tag_line": roster.tag_line,
        "total_cs": total_cs,
        "game_name": roster.game_name,
        "champion_id": champion_id,
        "first_blood": first_blood,
        "first_tower": first_tower,
        "participant_id": participant_id,
    }


def winner_loser_evidence(kind: str) -> tuple[dict, dict]:
    """Return (winner_flags, loser_flags) with exactly one DEC-001 qualifier."""
    if kind == "fb":
        winner = {"first_blood": True, "first_tower": False, "total_cs": 48}
        loser = {"first_blood": False, "first_tower": False, "total_cs": 55}
    elif kind == "ft":
        winner = {"first_blood": False, "first_tower": True, "total_cs": 62}
        loser = {"first_blood": False, "first_tower": False, "total_cs": 71}
    elif kind == "cs":
        winner = {"first_blood": False, "first_tower": False, "total_cs": 112}
        loser = {"first_blood": False, "first_tower": False, "total_cs": 89}
    else:
        raise ValueError(f"unknown evidence kind: {kind}")
    return winner, loser


def build_match(index: int) -> tuple[dict, RosterPlayer, str]:
    """Build one MATCH_SNAPSHOT payload.

    Returns (payload, winner_roster_player, evidence_kind).
    """
    kind = evidence_kind(index)
    left, right = PAIRINGS[(index - 1) % len(PAIRINGS)]
    # Alternate winner within the pairing so all roster players collect W–L.
    if index % 2 == 1:
        winner, loser = left, right
    else:
        winner, loser = right, left
    # Alternate which side hosts the winner (team 100 vs 200).
    if (index // 2) % 2 == 0:
        blue, red = winner, loser
        blue_is_winner = True
    else:
        blue, red = loser, winner
        blue_is_winner = False

    winner_flags, loser_flags = winner_loser_evidence(kind)
    if blue_is_winner:
        blue_flags, red_flags = winner_flags, loser_flags
    else:
        blue_flags, red_flags = loser_flags, winner_flags

    blue_player = build_player(
        blue,
        team_id=100,
        participant_id=1,
        champion_id=CHAMPION_IDS[(index - 1) % len(CHAMPION_IDS)],
        **blue_flags,
    )
    red_player = build_player(
        red,
        team_id=200,
        participant_id=2,
        champion_id=CHAMPION_IDS[index % len(CHAMPION_IDS)],
        **red_flags,
    )

    if not (qualifies(**blue_flags) ^ qualifies(**red_flags)):
        raise RuntimeError(f"match {index} is not DEC-001 decidable")

    creation = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc) + timedelta(
        days=(index - 1) % 7,
        hours=(index - 1) % 5,
        minutes=3 * (index - 1),
    )

    payload = {
        "match": {
            "game_id": GAME_ID_BASE + index,
            "game_duration": 480 + (index * 17) % 900,
            "game_creation_date": creation.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        },
        "players": [blue_player, red_player],
        "eventType": "MATCH_SNAPSHOT",
        "event_type": "SNAPSHOT",
    }
    return payload, winner, kind


def write_expected(
    wins: Counter[str],
    losses: Counter[str],
    evidence_counts: Counter[str],
) -> None:
    lines = [
        "# Seed corpus expected outcomes",
        "",
        "After a clean load of `corpus/001.json` … `050.json` through",
        "`POST /api/events` and worker catch-up (no prior `910000001`–`910000050`",
        "matches), the ledger should match the counts below.",
        "",
        "## Evidence mix (winner side)",
        "",
        f"| Kind | Matches |",
        f"|------|--------:|",
        f"| first_blood | {evidence_counts['fb']} |",
        f"| first_tower | {evidence_counts['ft']} |",
        f"| CS ≥ 100 | {evidence_counts['cs']} |",
        f"| **Total** | **{sum(evidence_counts.values())}** |",
        "",
        "## Per-player W–L",
        "",
        "| Player | Riot ID | Wins | Losses |",
        "|--------|---------|-----:|-------:|",
    ]
    for player in ROSTER:
        lines.append(
            f"| `{player.key}` | {player.game_name}#{player.tag_line} | "
            f"{wins[player.key]} | {losses[player.key]} |"
        )
    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- `game_id` range: `910000001`–`910000050`.",
            "- Every match has exactly one DEC-001 winner (no neither/ambiguous).",
            "- Regenerated by `python generate_corpus.py`.",
            "",
        ]
    )
    EXPECTED_PATH.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    for stale in CORPUS_DIR.glob("*.json"):
        stale.unlink()

    wins: Counter[str] = Counter()
    losses: Counter[str] = Counter()
    evidence_counts: Counter[str] = Counter()

    for index in range(1, CORPUS_SIZE + 1):
        payload, winner, kind = build_match(index)
        evidence_counts[kind] += 1
        wins[winner.key] += 1
        players = payload["players"]
        for row in players:
            key = next(p.key for p in ROSTER if p.puuid == row["puuid"])
            if key != winner.key:
                losses[key] += 1

        out_path = CORPUS_DIR / f"{index:03d}.json"
        out_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    write_expected(wins, losses, evidence_counts)
    print(f"Wrote {CORPUS_SIZE} fixtures to {CORPUS_DIR}")
    print(f"Wrote {EXPECTED_PATH.name}")
    print(f"Evidence mix: {dict(evidence_counts)}")
    print(f"Wins: {dict(wins)}")
    print(f"Losses: {dict(losses)}")


if __name__ == "__main__":
    main()
