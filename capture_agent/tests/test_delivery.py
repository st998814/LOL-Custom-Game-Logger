import asyncio
from pathlib import Path

import pytest

from services.delivery import DeliveryResult, DeliveryService
from transport.errors import LocalStoreError, SinkUnavailableError


def snapshot(game_id: int) -> dict:
    return {"match": {"game_id": game_id}, "players": [], "eventType": "MATCH_SNAPSHOT"}


class FakeSink:
    def __init__(self, up: bool = True, fail_on: set[int] | None = None):
        self.up = up
        self.fail_on = fail_on or set()
        self.sent: list[int] = []

    async def send_snapshot(self, snap: dict) -> None:
        game_id = snap["match"]["game_id"]
        if not self.up or game_id in self.fail_on:
            raise SinkUnavailableError("down")
        self.sent.append(game_id)


class FakeStore:
    def __init__(self, fail_store: bool = False):
        self.files: dict[Path, dict | None] = {}
        self.fail_store = fail_store
        self.fail_remove = False

    def store_snapshot(self, snap: dict) -> Path:
        if self.fail_store:
            raise LocalStoreError("disk full")
        path = Path(f"MATCH_SNAPSHOT-{snap['match']['game_id']}.json")
        self.files[path] = snap
        return path

    def pending(self) -> list[Path]:
        return sorted(self.files)

    def load(self, path: Path) -> dict:
        snap = self.files[path]
        if snap is None:
            raise LocalStoreError(f"corrupt {path}")
        return snap

    def remove(self, path: Path) -> None:
        if self.fail_remove:
            raise LocalStoreError("permission denied")
        self.files.pop(path, None)


def test_deliver_returns_sent_when_sink_accepts():
    sink, store = FakeSink(), FakeStore()

    result = asyncio.run(DeliveryService(sink, store).deliver(snapshot(1)))

    assert result is DeliveryResult.SENT
    assert sink.sent == [1]
    assert store.files == {}


def test_deliver_stores_locally_when_sink_unavailable():
    sink, store = FakeSink(up=False), FakeStore()

    result = asyncio.run(DeliveryService(sink, store).deliver(snapshot(1)))

    assert result is DeliveryResult.STORED
    assert list(store.files) == [Path("MATCH_SNAPSHOT-1.json")]


def test_deliver_propagates_local_store_error_when_both_fail():
    service = DeliveryService(FakeSink(up=False), FakeStore(fail_store=True))

    with pytest.raises(LocalStoreError):
        asyncio.run(service.deliver(snapshot(1)))


def test_flush_sends_and_removes_all_pending():
    sink, store = FakeSink(), FakeStore()
    store.store_snapshot(snapshot(1))
    store.store_snapshot(snapshot(2))

    sent = asyncio.run(DeliveryService(sink, store).flush_pending())

    assert sent == 2
    assert sink.sent == [1, 2]
    assert store.pending() == []


def test_flush_stops_at_first_unavailable_and_keeps_the_rest():
    sink, store = FakeSink(fail_on={2}), FakeStore()
    for game_id in (1, 2, 3):
        store.store_snapshot(snapshot(game_id))

    sent = asyncio.run(DeliveryService(sink, store).flush_pending())

    assert sent == 1
    assert sink.sent == [1]
    assert store.pending() == [
        Path("MATCH_SNAPSHOT-2.json"),
        Path("MATCH_SNAPSHOT-3.json"),
    ]


def test_flush_skips_unreadable_file_and_continues():
    sink, store = FakeSink(), FakeStore()
    store.files[Path("MATCH_SNAPSHOT-1.json")] = None
    store.store_snapshot(snapshot(2))

    sent = asyncio.run(DeliveryService(sink, store).flush_pending())

    assert sent == 1
    assert sink.sent == [2]
    assert store.pending() == [Path("MATCH_SNAPSHOT-1.json")]


def test_flush_counts_delivery_even_if_remove_fails():
    sink, store = FakeSink(), FakeStore()
    store.store_snapshot(snapshot(1))
    store.fail_remove = True

    sent = asyncio.run(DeliveryService(sink, store).flush_pending())

    assert sent == 1
    assert sink.sent == [1]
