from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


BOT_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    telegram_bot_token: str
    api_base_url: str
    player_map_path: Path


def load_settings() -> Settings:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN is required. Export it before starting the bot."
        )

    api_base_url = os.environ.get("API_BASE_URL", "http://127.0.0.1:7871").strip()
    map_path_raw = os.environ.get(
        "PLAYER_MAP_PATH",
        str(BOT_ROOT / "config" / "player_map.json"),
    )
    player_map_path = Path(map_path_raw).expanduser()
    if not player_map_path.is_absolute():
        player_map_path = (Path.cwd() / player_map_path).resolve()

    return Settings(
        telegram_bot_token=token,
        api_base_url=api_base_url.rstrip("/"),
        player_map_path=player_map_path,
    )
