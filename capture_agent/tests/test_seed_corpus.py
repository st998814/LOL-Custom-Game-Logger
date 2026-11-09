"""Invariants for the committed 50-match dogfood seed corpus."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

CLIENT_ROOT = Path(__file__).resolve().parents[1]
CORPUS_DIR = CLIENT_ROOT / "data" / "seed" / "corpus"
CORPUS_SIZE = 50
GAME_ID_BASE = 910_000_000
CS_WIN_THRESHOLD = 100

REQUIRED_MATCH_KEYS = {"game_id", "game_duration", "game_creation_date"}
REQUIRED_PLAYER_KEYS = {
    "puuid",
    "team_id",
    "tag_line",
    "total_cs",
    "game_name",
    "champion_id",
    "first_blood",
    "first_tower",
    "participant_id",
}


def player_qualifies(player: dict) -> bool:
    """DEC-001 OR rule (mirror of server matchSnapshot.service)."""
    return bool(
        player["first_blood"]
        or player["first_tower"]
        or player["total_cs"] >= CS_WIN_THRESHOLD
    )


@pytest.fixture(scope="module")
def corpus_payloads() -> list[tuple[Path, dict]]:
    files = sorted(CORPUS_DIR.glob("*.json"))
    assert len(files) == CORPUS_SIZE, (
        f"expected {CORPUS_SIZE} corpus files, found {len(files)} in {CORPUS_DIR}"
    )
    payloads: list[tuple[Path, dict]] = []
    for path in files:
        payloads.append((path, json.loads(path.read_text(encoding="utf-8"))))
    return payloads


def test_corpus_filenames_are_001_through_050(corpus_payloads):
    names = [path.name for path, _ in corpus_payloads]
    assert names == [f"{i:03d}.json" for i in range(1, CORPUS_SIZE + 1)]


def test_corpus_game_ids_unique_and_reserved(corpus_payloads):
    game_ids = [payload["match"]["game_id"] for _, payload in corpus_payloads]
    assert game_ids == list(range(GAME_ID_BASE + 1, GAME_ID_BASE + CORPUS_SIZE + 1))
    assert len(set(game_ids)) == CORPUS_SIZE


@pytest.mark.parametrize("index", range(CORPUS_SIZE))
def test_each_payload_shape_and_dec001(corpus_payloads, index: int):
    path, payload = corpus_payloads[index]

    assert payload.get("eventType") == "MATCH_SNAPSHOT", path.name
    assert payload.get("event_type") == "SNAPSHOT", path.name

    match = payload["match"]
    assert REQUIRED_MATCH_KEYS <= set(match.keys()), path.name

    players = payload["players"]
    assert isinstance(players, list) and len(players) == 2, path.name
    assert {p["team_id"] for p in players} == {100, 200}, path.name
    assert {p["participant_id"] for p in players} == {1, 2}, path.name

    for player in players:
        assert REQUIRED_PLAYER_KEYS <= set(player.keys()), path.name
        assert isinstance(player["first_blood"], bool), path.name
        assert isinstance(player["first_tower"], bool), path.name
        assert isinstance(player["total_cs"], int), path.name

    # Exclusive flag sanity (server fails if both claim FB or FT).
    assert sum(1 for p in players if p["first_blood"]) <= 1, path.name
    assert sum(1 for p in players if p["first_tower"]) <= 1, path.name

    qualifiers = [p for p in players if player_qualifies(p)]
    assert len(qualifiers) == 1, (
        f"{path.name}: expected exactly one DEC-001 winner, got {len(qualifiers)}"
    )
