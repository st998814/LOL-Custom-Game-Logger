from dataclasses import dataclass
from typing import Protocol

from account.errors import AccountUnavailableError, AlreadyLinkedError
from infra.errors import HttpStatusError, TransportError
from infra.http import HttpClient

STATUS_PATH = "user/status"
LINK_PATH = "user/register/link"


@dataclass(frozen=True)
class AccountRecord:
    registered: bool  # the server has a player row for this PUUID
    linked: bool      # that row has a Telegram id


@dataclass(frozen=True)
class LinkTicket:
    link: str
    expires_in: int | None  # seconds until the link expires, if the server says


class AccountApi(Protocol):
    async def status(self, puuid: str) -> AccountRecord: ...

    async def request_link(self, puuid: str) -> LinkTicket: ...


class HttpAccountApi(AccountApi):
    """Talks to the server's user account endpoints.

    Every failure surfaces as AccountUnavailableError (or AlreadyLinkedError
    for a 409 on link), so callers never depend on HTTP errors.
    """

    def __init__(self, http: HttpClient):
        self._http = http

    async def status(self, puuid: str) -> AccountRecord:
        try:
            payload = await self._http.get(STATUS_PATH, params={"puuid": puuid})
        except TransportError as e:
            raise AccountUnavailableError(f"Account status unavailable: {e}") from e

        if not isinstance(payload, dict):
            raise AccountUnavailableError("Account status payload is not an object")
        registered = payload.get("registered")
        linked = payload.get("linked")
        if not isinstance(registered, bool) or not isinstance(linked, bool):
            raise AccountUnavailableError(
                "Account status payload needs boolean 'registered' and 'linked'"
            )
        return AccountRecord(registered=registered, linked=linked)

    async def request_link(self, puuid: str) -> LinkTicket:
        try:
            payload = await self._http.post(LINK_PATH, {"puuid": puuid})
        except HttpStatusError as e:
            if e.status == 409:
                raise AlreadyLinkedError("Account is already linked to Telegram") from e
            raise AccountUnavailableError(f"Link request rejected: {e}") from e
        except TransportError as e:
            raise AccountUnavailableError(f"Link request unavailable: {e}") from e

        if not isinstance(payload, dict):
            raise AccountUnavailableError("Link payload is not an object")
        link = payload.get("link")
        if not isinstance(link, str) or not link:
            raise AccountUnavailableError("Link payload is missing 'link'")

        expires_in = payload.get("expiresIn")
        # bool is an int subclass, so reject it explicitly.
        if not isinstance(expires_in, int) or isinstance(expires_in, bool):
            expires_in = None
        return LinkTicket(link=link, expires_in=expires_in)
