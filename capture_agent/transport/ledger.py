import logging
from transport.sink import SnapshotSink
from infra.errors import HttpStatusError
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
            if e.status == 409:
                log.info("Snapshot already ingested (409), treating as delivered")
                return
            raise
        log.info("Snapshot sent successfully")
