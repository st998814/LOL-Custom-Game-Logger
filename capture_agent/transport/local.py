import json
import logging
import os
from pathlib import Path
from transport.errors import LocalStoreError
from transport.sink import SnapshotStore

log = logging.getLogger(__name__)

FILE_PREFIX = "MATCH_SNAPSHOT-"


class LocalSnapshotStore(SnapshotStore):
    """One JSON file per game, so a failed delivery never overwrites another."""

    def __init__(self, directory: Path):
        self._directory = Path(directory)

    def store_snapshot(self, snapshot: dict) -> Path:
        try:
            game_id = snapshot["match"]["game_id"]
        except (KeyError, TypeError) as e:
            raise LocalStoreError("Snapshot has no match.game_id") from e

        target = self._directory / f"{FILE_PREFIX}{game_id}.json"
        tmp = target.with_suffix(".json.tmp")
        try:
            self._directory.mkdir(parents=True, exist_ok=True)
            with tmp.open("w", encoding="utf-8") as f:
                json.dump(snapshot, f, ensure_ascii=False, indent=2)
            os.replace(tmp, target)
        except OSError as e:
            tmp.unlink(missing_ok=True)
            raise LocalStoreError(f"Failed to store snapshot at {target}: {e}") from e

        log.info("Snapshot stored locally at %s", target)
        return target

    def pending(self) -> list[Path]:
        """Snapshots saved locally that still need to be delivered."""
        if not self._directory.exists():
            return []
        return sorted(self._directory.glob(f"{FILE_PREFIX}*.json"))

    def load(self, path: Path) -> dict:
        try:
            with path.open(encoding="utf-8") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            raise LocalStoreError(f"Failed to load snapshot at {path}: {e}") from e

    def remove(self, path: Path) -> None:
        try:
            path.unlink(missing_ok=True)
        except OSError as e:
            raise LocalStoreError(f"Failed to remove snapshot at {path}: {e}") from e
