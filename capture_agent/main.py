import asyncio
import logging
import sys

from account.api import HttpAccountApi
from app import CaptureAgent
from configs import configs
from errors import BootstrapError
from infra.http import HttpClient
from lcu.connector import LcuConnector
from lcu.credential_resolver import LCUCredential , ProcessInspector
from services.account import AccountService
from services.capture import MatchCaptureService
from services.delivery import DeliveryService
from transport.ledger import HttpSnapshotSink
from transport.local import LocalSnapshotStore
from utils.logger import configure_logging
from utils.qrcode import generate_qr_code

VERSION = "0.0.1"
BOOTSTRAP_ATTEMPTS = 5

log = logging.getLogger(__name__)


async def main() -> int:
    configure_logging()

    # Composition root: the only place that knows concrete implementations.
    # main owns the HttpClient so it can close the session on every exit path.
    http = HttpClient(configs.API_BASE_URL)
    delivery = DeliveryService(
        sink=HttpSnapshotSink(http),
        store=LocalSnapshotStore(configs.PENDING_SNAPSHOT_DIR),
    )
    app = CaptureAgent(
        version=VERSION,
        connector=LcuConnector(resolver=LCUCredential(ProcessInspector())),
        capture=MatchCaptureService(),
        delivery=delivery,
        account=AccountService(
            api=HttpAccountApi(http),
            show_link=generate_qr_code,
        ),
    )

    try:
        log.info("App bootstrap starting...")
        await app.bootstrap(attempts=BOOTSTRAP_ATTEMPTS)
        await app.identify()
        log.info("App bootstrap successful, waiting for games")
        await app.run(bootstrap_attempts=BOOTSTRAP_ATTEMPTS)
    except BootstrapError as e:
        # Raised on first start or when reconnecting after losing the LCU.
        log.critical("App stopped: could not connect to the League client: %s", e)
        return 1
    except asyncio.CancelledError:
        # asyncio.run cancels the main task on Ctrl+C; treat it as a clean stop.
        log.info("Shutdown requested, stopping")
        return 0
    finally:
        await http.close()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except KeyboardInterrupt:
        # Ctrl+C outside the task (e.g. during loop teardown) is still a clean stop.
        sys.exit(0)
