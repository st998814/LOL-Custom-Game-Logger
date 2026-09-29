import copy

import pytest

from data.parser import Packer, validate_duel_snapshot
from lcu import error
from tests.conftest import load_lcu_match_raw


def test_validate_duel_snapshot_accepts_2_player_fixture():
    validate_duel_snapshot(load_lcu_match_raw())


def test_validate_duel_snapshot_rejects_non_duel():
    raw = load_lcu_match_raw()
    raw["participants"] = [copy.deepcopy(raw["participants"][0]) for _ in range(5)]
    raw["participantIdentities"] = [
        copy.deepcopy(raw["participantIdentities"][0]) for _ in range(5)
    ]

    with pytest.raises(error.InvalidDuelError, match="participants=5"):
        validate_duel_snapshot(raw)


def test_validate_duel_snapshot_rejects_mismatched_lengths():
    raw = load_lcu_match_raw()
    raw["participantIdentities"] = raw["participantIdentities"] + [
        copy.deepcopy(raw["participantIdentities"][0])
    ]

    with pytest.raises(error.InvalidDuelError) as exc_info:
        validate_duel_snapshot(raw)

    message = str(exc_info.value)
    assert "participants=2" in message
    assert "participantIdentities=3" in message


def test_validate_duel_snapshot_rejects_missing_participant_identities():
    raw = load_lcu_match_raw()
    del raw["participantIdentities"]

    with pytest.raises(error.InvalidDuelError, match="participantIdentities=None"):
        validate_duel_snapshot(raw)


def test_packer_maps_lcu_match_fixture_to_ingest_shape():
    raw = load_lcu_match_raw()

    packed = Packer(raw).pack()

    assert packed["match"] == {
        "game_id": 695827639,
        "game_duration": 628,
        "game_creation_date": "2026-03-16T12:32:09.240Z",
    }
    assert len(packed["players"]) == 2

    player_one, player_two = packed["players"]

    assert player_one == {
        "participant_id": 1,
        "team_id": 100,
        "puuid": "47842bcd-35c8-5a94-b368-2d4aa6867e95",
        "game_name": "PlayerOne",
        "tag_line": "5715",
        "champion_id": 54,
        "first_blood": False,
        "first_tower": False,
        "total_cs": 49,
    }
    assert player_two == {
        "participant_id": 2,
        "team_id": 200,
        "puuid": "333b88e5-36d7-558e-9084-b5afd88a5776",
        "game_name": "PlayerTwo",
        "tag_line": "yugi",
        "champion_id": 82,
        "first_blood": True,
        "first_tower": False,
        "total_cs": 69,
    }


def test_packer_includes_expected_top_level_keys():
    raw = load_lcu_match_raw()

    packed = Packer(raw).pack()

    assert set(packed.keys()) == {"match", "players", "event_type"}
    assert packed["event_type"] is None

    for player in packed["players"]:
        assert set(player.keys()) == {
            "participant_id",
            "team_id",
            "puuid",
            "game_name",
            "tag_line",
            "champion_id",
            "first_blood",
            "first_tower",
            "total_cs",
        }
