from pathlib import Path
from typing import Protocol


class SnapshotSink(Protocol):
    async def send_snapshot(self, snapshot: dict) -> None: ...


class SnapshotStore(Protocol):
    
    def store_snapshot(self, snapshot: dict) -> Path: ...

    def pending(self) -> list[Path]: ...

    def load(self, path: Path) -> dict: ...

    def remove(self, path: Path) -> None: ...