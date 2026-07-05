import json
from pathlib import Path

from data.parser import Packer

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "lcu_match_raw.json"


def test_packer_maps_lcu_match_fixture_to_ingest_shape():
    raw = json.loads(FIXTURE_PATH.read_text())

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
    raw = json.loads(FIXTURE_PATH.read_text())

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
