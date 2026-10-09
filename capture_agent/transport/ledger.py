import logging
from transport.sink import SnapshotSink
from transport.errors import SinkUnavailableError
from infra.errors import HttpStatusError, TransportError
from infra.http import HttpClient

log = logging.getLogger(__name__)

INGEST_PATH = "events"


class HttpSnapshotSink(SnapshotSink):
    """Delivers match snapshots to the server's ingest endpoint."""

    def __init__(self, http: HttpClient):
        self._http = http

    async def send_snapshot(self, snapshot: dict) -> None:
        try:
            await self._http.post(INGEST_PATH, snapshot)
        except HttpStatusError as e:
            # The server already has this game (e.g. a resend after a flush),
            # so the snapshot is safe and must not be stored again.
            if e.status == 409:
                log.info("Snapshot already ingested (409), treating as delivered")
                return
            raise SinkUnavailableError(f"Ingest rejected snapshot: {e}") from e
        except TransportError as e:
            raise SinkUnavailableError(f"Ingest unreachable: {e}") from e
        log.info("Snapshot sent successfully")
