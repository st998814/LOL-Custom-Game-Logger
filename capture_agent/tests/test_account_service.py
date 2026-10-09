import asyncio
import logging

import pytest

from account.api import AccountRecord, LinkTicket
from account.errors import AccountUnavailableError, AlreadyLinkedError
from lcu.summoner import CurrentSummoner
from services.account import AccountService, AccountStatus
from services.delivery import DeliveryResult

HOST = CurrentSummoner(puuid="host-puuid", game_name="Host", tagline="OCE")
LINK = "https://t.me/bot?start=abc"

NEW = AccountRecord(registered=False, linked=False)
UNLINKED = AccountRecord(registered=True, linked=False)
LINKED = AccountRecord(registered=True, linked=True)


class FakeAccountApi:
    """Answers status() from a queue; each item is a record or an exception."""

    def __init__(self, *statuses, link_error: Exception | None = None):
        self.statuses = list(statuses)
        self.link_error = link_error
        self.status_calls: list[str] = []
        self.link_calls: list[str] = []

    async def status(self, puuid):
        self.status_calls.append(puuid)
        answer = self.statuses.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer

    async def request_link(self, puuid):
        self.link_calls.append(puuid)
        if self.link_error:
            raise self.link_error
        return LinkTicket(link=LINK, expires_in=600)


def make_service(api: FakeAccountApi) -> tuple[AccountService, list[str]]:
    shown: list[str] = []
    return AccountService(api, shown.append), shown


def identified(api: FakeAccountApi) -> tuple[AccountService, list[str]]:
    service, shown = make_service(api)
    asyncio.run(service.identify(HOST))
    return service, shown


def test_identify_welcomes_new_user_without_link(caplog):
    caplog.set_level(logging.INFO)
    api = FakeAccountApi(NEW)
    service, shown = make_service(api)

    status = asyncio.run(service.identify(HOST))

    assert status is AccountStatus.NEW
    assert "Welcome Host#OCE" in caplog.text
    assert shown == []
    assert api.status_calls == ["host-puuid"]
    assert api.link_calls == []


def test_identify_offers_link_to_unlinked_user(caplog):
    caplog.set_level(logging.INFO)
    api = FakeAccountApi(UNLINKED)
    service, shown = make_service(api)

    status = asyncio.run(service.identify(HOST))

    assert status is AccountStatus.UNLINKED
    assert shown == [LINK]
    assert api.link_calls == ["host-puuid"]
    assert "expires in 10 min" in caplog.text


def test_identify_does_nothing_for_linked_user():
    api = FakeAccountApi(LINKED)
    service, shown = make_service(api)

    assert asyncio.run(service.identify(HOST)) is AccountStatus.LINKED
    assert shown == []
    assert api.link_calls == []


def test_identify_is_unknown_when_server_unavailable(caplog):
    api = FakeAccountApi(AccountUnavailableError("down"))
    service, shown = make_service(api)

    assert asyncio.run(service.identify(HOST)) is AccountStatus.UNKNOWN
    assert shown == []
    assert "Could not check account status" in caplog.text


def test_identify_marks_linked_when_link_request_conflicts():
    api = FakeAccountApi(UNLINKED, link_error=AlreadyLinkedError("taken"))
    service, shown = make_service(api)

    assert asyncio.run(service.identify(HOST)) is AccountStatus.LINKED
    assert shown == []


def test_identify_keeps_unlinked_when_link_request_fails(caplog):
    api = FakeAccountApi(UNLINKED, link_error=AccountUnavailableError("down"))
    service, shown = make_service(api)

    assert asyncio.run(service.identify(HOST)) is AccountStatus.UNLINKED
    assert shown == []
    assert "Could not create a Telegram link" in caplog.text


def test_first_sent_game_offers_link_once(caplog):
    caplog.set_level(logging.INFO)
    api = FakeAccountApi(NEW)
    service, shown = identified(api)

    asyncio.run(service.on_delivered(DeliveryResult.SENT))
    asyncio.run(service.on_delivered(DeliveryResult.SENT))

    assert shown == [LINK]
    assert caplog.text.count("Your first game was received") == 1
    assert service.status is AccountStatus.UNLINKED


def test_stored_game_is_not_received():
    service, shown = identified(FakeAccountApi(NEW))

    asyncio.run(service.on_delivered(DeliveryResult.STORED))

    assert shown == []
    assert service.status is AccountStatus.NEW


@pytest.mark.parametrize("record", [UNLINKED, LINKED])
def test_sent_game_does_nothing_for_known_user(record):
    api = FakeAccountApi(record, link_error=AlreadyLinkedError("taken"))
    service, shown = identified(api)
    links_after_identify = len(api.link_calls)

    asyncio.run(service.on_delivered(DeliveryResult.SENT))

    assert len(api.link_calls) == links_after_identify
    assert shown == []


def test_empty_flush_does_nothing():
    service, shown = identified(FakeAccountApi(NEW))

    asyncio.run(service.on_flushed(0))

    assert shown == []
    assert service.status is AccountStatus.NEW


def test_flushed_games_count_as_first_game():
    service, shown = identified(FakeAccountApi(NEW))

    asyncio.run(service.on_flushed(2))

    assert shown == [LINK]
    assert service.status is AccountStatus.UNLINKED


def test_unknown_status_is_rechecked_when_a_game_is_received():
    api = FakeAccountApi(AccountUnavailableError("down"), NEW)
    service, shown = identified(api)

    asyncio.run(service.on_delivered(DeliveryResult.SENT))

    assert len(api.status_calls) == 2
    assert shown == [LINK]
    assert service.status is AccountStatus.UNLINKED


def test_unknown_status_stays_unknown_when_recheck_fails():
    api = FakeAccountApi(AccountUnavailableError("down"), AccountUnavailableError("down"))
    service, shown = identified(api)

    asyncio.run(service.on_delivered(DeliveryResult.SENT))

    assert shown == []
    assert service.status is AccountStatus.UNKNOWN


def test_received_game_before_identify_does_nothing():
    api = FakeAccountApi()
    service, shown = make_service(api)

    asyncio.run(service.on_delivered(DeliveryResult.SENT))

    assert api.status_calls == []
    assert shown == []


def test_identify_again_uses_the_new_summoner():
    api = FakeAccountApi(LINKED, NEW)
    service, _ = identified(api)
    other = CurrentSummoner(puuid="other-puuid", game_name="Other", tagline="NA1")

    assert asyncio.run(service.identify(other)) is AccountStatus.NEW
    assert api.status_calls == ["host-puuid", "other-puuid"]
