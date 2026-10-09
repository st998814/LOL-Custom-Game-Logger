import logging
from enum import Enum , auto
import asyncio
from services.capture import MatchCaptureService
from services.delivery import DeliveryService
from lcu.connector import LcuConnector , LcuSession
from lcu.error import (
    CredentialsParsingError,
    InvalidDuelError,
    InvalidSessionPayloadError,
    LCUAuthError,
    LCUNotReadyError,
    LCURequestError,
    LCUResponseParseError,
    LCUUnreachableError,
    LCUWorkflowError,
)
from transport.errors import LocalStoreError
from errors import BootstrapError, InvalidStateError
log = logging.getLogger(__name__)

CLIENT_VERSION = "0.0.1"

# Errors worth retrying while connecting: League may still be starting up,
# the user may not be logged in yet, or the lockfile token may be stale.
BOOTSTRAP_RETRY_ERRORS = (
    CredentialsParsingError,
    LCUUnreachableError,
    LCUAuthError,
    LCUNotReadyError,
    LCURequestError,
    LCUResponseParseError,
)

# Problems with this one game only: log, skip it, wait for the next game.
SKIP_GAME_ERRORS = (
    InvalidDuelError,
    LCUWorkflowError,
    InvalidSessionPayloadError,
    LCUResponseParseError,
    LCUNotReadyError,
)

# Some skip errors (e.g. a missing gameId) fire mid-game and would repeat
# immediately on the next cycle, so pause before looking for a game again.
SKIP_BACKOFF_SECONDS = 1

# The League client went away (closed/restarted, token rotated): reconnect
# via bootstrap; only a failed bootstrap stops the agent.
RECONNECT_ERRORS = (
    LCUUnreachableError,
    LCUAuthError,
    LCURequestError,
)


class AppState(Enum):
    CREATED = auto()
    READY = auto()
    RUNNING = auto()
    RECONNECTING = auto() # lost the League client, re-running bootstrap
    FAILED = auto() # exit with fatal error
    FINISHED = auto() # exit without error (terminate manually by Ctrl+C)


class CaptureAgent:

    def __init__(
        self,
        version: str,
        connector: LcuConnector,
        capture: MatchCaptureService,
        delivery: DeliveryService,
    ):
        self.version  = version
        self.state = AppState.CREATED
        self._connector = connector
        # Services are peers: run() hands the captured snapshot to delivery,
        # so neither service knows about the other.
        self._capture = capture
        self._delivery = delivery
        self._lcu : LcuSession | None = None

    # LCU is a hard dependency: the agent cannot do anything without it.
    async def bootstrap(self , attempts : int):
        last_error: Exception | None = None
        try:
            for attempt in range(1, attempts + 1):
                try:
                    self._lcu = await self._connector.connect() # get the reusable connection to the LCU
                    log.info("Summoner information: %s", self._lcu.summoner)
                    self.state = AppState.READY
                    log.info("The client has been bootstrapped successfully")
                    return
                except BOOTSTRAP_RETRY_ERRORS as e:
                    last_error = e
                    log.warning("Bootstrap attempt %d/%d failed: %s", attempt, attempts, e)
                    await asyncio.sleep(2)
        except asyncio.CancelledError:
            # Ctrl+C can arrive before run() starts, e.g. while League is still launching.
            self.state = AppState.FINISHED
            raise
        except Exception:
            self.state = AppState.FAILED
            raise

        self.state = AppState.FAILED
        raise BootstrapError(f'Client failed to bootstrap after {attempts} attempts') from last_error

    async def run(self, bootstrap_attempts: int = 5) -> None:
        """Capture and deliver games forever, until cancelled (Ctrl+C).

        Raises BootstrapError if the LCU is lost and reconnecting fails.
        """
        if self.state != AppState.READY:
            raise InvalidStateError(f"run() requires READY, got {self.state}")

        try:
            # Pending snapshots are flushed once per agent start only; anything
            # still undeliverable waits for the next start.
            await self._delivery.flush_pending()

            while True:
                await self._run_once(bootstrap_attempts)
        except asyncio.CancelledError:
            # Ctrl+C is the normal way to stop the forever loop.
            self.state = AppState.FINISHED
            raise
        except Exception:
            self.state = AppState.FAILED
            raise

    async def _run_once(self, bootstrap_attempts: int) -> None:
        """One wait -> capture -> deliver cycle, mapping errors to the policy."""
        self.state = AppState.RUNNING
        try:
            snapshot = await self._capture.capture(self._lcu.client)
        except SKIP_GAME_ERRORS as e:
            log.warning("Skipping this game: %s", e)
            self.state = AppState.READY
            await asyncio.sleep(SKIP_BACKOFF_SECONDS)
            return
        except RECONNECT_ERRORS as e:
            log.warning("Lost connection to the League client, reconnecting: %s", e)
            self.state = AppState.RECONNECTING
            await self.bootstrap(bootstrap_attempts)
            return

        game_id = snapshot["match"]["game_id"]
        try:
            result = await self._delivery.deliver(snapshot)
            log.info("Game %s delivery result: %s", game_id, result.name)
        except LocalStoreError as e:
            # Server down and local save failed: this match is lost, but the
            # agent keeps running so the next game can still be captured.
            log.error(
                "Game %s lost: server unavailable and local save failed: %s",
                game_id, e,
            )
        self.state = AppState.READY
