from __future__ import annotations

import json
from pathlib import Path


def load_player_map(path: Path) -> dict[str, str]:
    """Load Telegram user id → puuid map. Missing file → empty map."""
    if not path.is_file():
        return {}

    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)

    if not isinstance(data, dict):
        raise ValueError(f"Player map must be a JSON object: {path}")

    result: dict[str, str] = {}
    for key, value in data.items():
        telegram_id = str(key).strip()
        puuid = str(value).strip() if value is not None else ""
        if telegram_id and puuid:
            result[telegram_id] = puuid
    return result
