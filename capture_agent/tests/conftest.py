import copy
import json
import sys
from pathlib import Path


CLIENT_ROOT = Path(__file__).resolve().parents[1]
LCU_MATCH_RAW_PATH = Path(__file__).parent / "fixtures" / "lcu_match_raw.json"
SEED_PAYLOAD_PATH = CLIENT_ROOT / "data" / "seed" / "payload.json"

if str(CLIENT_ROOT) not in sys.path:
    sys.path.insert(0, str(CLIENT_ROOT))


def load_lcu_match_raw() -> dict:
    return json.loads(LCU_MATCH_RAW_PATH.read_text())


def load_seed_payload() -> dict:
    return json.loads(SEED_PAYLOAD_PATH.read_text())


def make_multi_player_lcu_snapshot(player_count: int) -> dict:
    raw = load_lcu_match_raw()
    raw["participants"] = [
        copy.deepcopy(raw["participants"][0]) for _ in range(player_count)
    ]
    raw["participantIdentities"] = [
        copy.deepcopy(raw["participantIdentities"][0])
        for _ in range(player_count)
    ]
    return raw
