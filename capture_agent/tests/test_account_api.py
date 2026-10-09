import asyncio

import pytest

from account.api import LINK_PATH, STATUS_PATH, AccountRecord, HttpAccountApi, LinkTicket
from account.errors import AccountUnavailableError, AlreadyLinkedError
from infra.errors import HttpConnectionError, HttpResponseParseError, HttpStatusError


class FakeHttp:
    def __init__(self, payload=None, error: Exception | None = None):
        self.payload = payload
        self.error = error
        self.calls: list[tuple] = []

    async def get(self, path, params=None):
        self.calls.append(("GET", path, params))
        if self.error:
            raise self.error
        return self.payload

    async def post(self, path, body):
        self.calls.append(("POST", path, body))
        if self.error:
            raise self.error
        return self.payload


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        ({"registered": False, "linked": False}, AccountRecord(False, False)),
        ({"registered": True, "linked": False}, AccountRecord(True, False)),
        ({"registered": True, "linked": True}, AccountRecord(True, True)),
    ],
)
def test_status_maps_payload_to_record(payload, expected):
    http = FakeHttp(payload)

    record = asyncio.run(HttpAccountApi(http).status("puuid-1"))

    assert record == expected
    assert http.calls == [("GET", STATUS_PATH, {"puuid": "puuid-1"})]


@pytest.mark.parametrize(
    "payload",
    [
        None,
        [],
        {"registered": True},
        {"registered": "yes", "linked": False},
        {"registered": 1, "linked": 0},
    ],
)
def test_status_rejects_malformed_payload(payload):
    with pytest.raises(AccountUnavailableError):
        asyncio.run(HttpAccountApi(FakeHttp(payload)).status("puuid-1"))


@pytest.mark.parametrize(
    "error",
    [HttpConnectionError("refused"), HttpStatusError(404, "Not found"), HttpResponseParseError("bad")],
)
def test_status_wraps_transport_errors(error):
    with pytest.raises(AccountUnavailableError):
        asyncio.run(HttpAccountApi(FakeHttp(error=error)).status("puuid-1"))


def test_request_link_returns_ticket_with_expiry():
    http = FakeHttp({"status": "pending", "link": "https://t.me/bot?start=abc", "expiresIn": 540})

    ticket = asyncio.run(HttpAccountApi(http).request_link("puuid-1"))

    assert ticket == LinkTicket(link="https://t.me/bot?start=abc", expires_in=540)
    assert http.calls == [("POST", LINK_PATH, {"puuid": "puuid-1"})]


@pytest.mark.parametrize("expires_in", [None, "600", True])
def test_request_link_ignores_missing_or_invalid_expiry(expires_in):
    payload = {"status": "pending", "link": "https://t.me/bot?start=abc"}
    if expires_in is not None:
        payload["expiresIn"] = expires_in

    ticket = asyncio.run(HttpAccountApi(FakeHttp(payload)).request_link("puuid-1"))

    assert ticket.expires_in is None


def test_request_link_maps_409_to_already_linked():
    http = FakeHttp(error=HttpStatusError(409, "already linked"))

    with pytest.raises(AlreadyLinkedError):
        asyncio.run(HttpAccountApi(http).request_link("puuid-1"))


@pytest.mark.parametrize(
    "error",
    [HttpConnectionError("refused"), HttpStatusError(400, "bad"), HttpStatusError(500, "boom")],
)
def test_request_link_wraps_other_failures(error):
    with pytest.raises(AccountUnavailableError):
        asyncio.run(HttpAccountApi(FakeHttp(error=error)).request_link("puuid-1"))


@pytest.mark.parametrize("payload", [None, [], {"status": "pending"}, {"link": ""}, {"link": 42}])
def test_request_link_rejects_malformed_payload(payload):
    with pytest.raises(AccountUnavailableError):
        asyncio.run(HttpAccountApi(FakeHttp(payload)).request_link("puuid-1"))
