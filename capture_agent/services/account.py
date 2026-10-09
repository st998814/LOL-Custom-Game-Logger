import logging
from enum import Enum, auto
from typing import Callable

from account.api import AccountApi, AccountRecord
from account.errors import AccountUnavailableError, AlreadyLinkedError
from lcu.summoner import CurrentSummoner
from services.delivery import DeliveryResult

log = logging.getLogger(__name__)


class AccountStatus(Enum):
    NEW = auto()       # the server has never seen this PUUID
    UNLINKED = auto()  # known PUUID without a Telegram id
    LINKED = auto()    # known PUUID with a Telegram id
    UNKNOWN = auto()   # the server could not be asked


def _to_status(record: AccountRecord) -> AccountStatus:
    if not record.registered:
        return AccountStatus.NEW
    if not record.linked:
        return AccountStatus.UNLINKED
    return AccountStatus.LINKED


class AccountService:
    """Owns the account policy for the host: welcome new users, offer Telegram linking.

    The host's PUUID is the only credential. Account checks are a soft
    dependency: no method here raises for server problems, so capture
    never stops because of them.
    """

    def __init__(self, api: AccountApi, show_link: Callable[[str], None]):
        self._api = api
        self._show_link = show_link
        self._puuid: str | None = None
        self._status = AccountStatus.UNKNOWN

    @property
    def status(self) -> AccountStatus:
        return self._status

    async def identify(self, summoner: CurrentSummoner) -> AccountStatus:
        """Classify the host after each bootstrap (the League account may have changed)."""
        self._puuid = summoner.puuid
        await self._refresh_status()

        if self._status is AccountStatus.NEW:
            log.info("Welcome %s#%s! Your duels will be logged.",
                     summoner.game_name, summoner.tagline)
        elif self._status is AccountStatus.UNLINKED:
            await self._offer_link()
        return self._status

    async def on_delivered(self, result: DeliveryResult) -> None:
        # A STORED snapshot has not reached the server, so it is not "received".
        if result is DeliveryResult.SENT:
            await self._on_game_received()

    async def on_flushed(self, sent: int) -> None:
        if sent:
            await self._on_game_received()

    async def _on_game_received(self) -> None:
        if self._status is AccountStatus.UNKNOWN:
            # The server just accepted a game, so it is reachable again.
            await self._refresh_status()
        if self._status is not AccountStatus.NEW:
            return
        log.info("Your first game was received.")
        self._status = AccountStatus.UNLINKED
        await self._offer_link()

    async def _refresh_status(self) -> None:
        if self._puuid is None:
            return
        try:
            record = await self._api.status(self._puuid)
        except AccountUnavailableError as e:
            log.warning("Could not check account status, continuing: %s", e)
            self._status = AccountStatus.UNKNOWN
            return
        self._status = _to_status(record)

    async def _offer_link(self) -> None:
        if self._puuid is None:
            return
        try:
            ticket = await self._api.request_link(self._puuid)
        except AlreadyLinkedError:
            self._status = AccountStatus.LINKED
            return
        except AccountUnavailableError as e:
            log.warning("Could not create a Telegram link: %s", e)
            return

        if ticket.expires_in is not None:
            log.info("Scan to link Telegram (expires in %d min): %s",
                     max(1, ticket.expires_in // 60), ticket.link)
        else:
            log.info("Scan to link Telegram: %s", ticket.link)
        self._show_link(ticket.link)
