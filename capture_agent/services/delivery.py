import logging
from enum import Enum, auto

from transport.errors import LocalStoreError, SinkUnavailableError
from transport.sink import SnapshotSink, SnapshotStore

log = logging.getLogger(__name__)


class DeliveryResult(Enum):
    SENT = auto()    # the sink accepted the snapshot (409 duplicates included)
    STORED = auto()  # the sink was unavailable; snapshot is pending locally


class DeliveryService:
    """Owns the delivery policy: try the sink first, fall back to the local store.

    The server is a soft dependency, so a STORED result is not a failure.
    Concrete sink/store are injected from main.py; this class only knows the
    transport protocols and SinkUnavailableError.
    """

    def __init__(self, sink: SnapshotSink, store: SnapshotStore):
        self._sink = sink
        self._store = store

    async def deliver(self, snapshot: dict) -> DeliveryResult:
        try:
            await self._sink.send_snapshot(snapshot)
            return DeliveryResult.SENT
        except SinkUnavailableError as e:
            log.warning("Delivery failed, storing snapshot locally: %s", e)

        # LocalStoreError is deliberately not caught: with both destinations
        # down the snapshot has nowhere to go, and the orchestrator decides
        # how to report it (it logs and keeps the agent running).
        path = self._store.store_snapshot(snapshot)
        log.info("Snapshot pending at %s", path)
        return DeliveryResult.STORED

    async def flush_pending(self) -> int:
        """Resend locally stored snapshots; returns how many were delivered.

        Called once after the first successful bootstrap. Snapshots left over
        because the server is still down wait until the next agent start.
        """
        sent = 0
        for path in self._store.pending():
            try:
                snapshot = self._store.load(path)
            except LocalStoreError as e:
                # One corrupt file must not block the rest of the queue.
                log.error("Skipping unreadable pending snapshot: %s", e)
                continue

            try:
                await self._sink.send_snapshot(snapshot)
            except SinkUnavailableError as e:
                # If the sink is down for this file it is down for all of them.
                log.warning("Sink still unavailable, stopping flush: %s", e)
                break

            # A failed remove only means a resend next time, which the server
            # answers with 409 (treated as delivered), so no duplicate match.
            try:
                self._store.remove(path)
            except LocalStoreError as e:
                log.error("Delivered but could not remove pending file: %s", e)
            sent += 1

        if sent:
            log.info("Flushed %d pending snapshot(s)", sent)
        return sent
