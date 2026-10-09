import asyncio
import json
from dataclasses import dataclass
from pathlib import Path

import pytest

from lcu import error
from lcu.agent import Colloctor, LCUResponse

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "lcu_match_raw.json"


@dataclass
class ScriptedResponse:
    api_name: str
    payload: object
    spec: object | None = None
    status_code: int = 200


class FakeConnection:
    def __init__(self, script: list[ScriptedResponse]):
        self._script = list(script)
        self.calls: list[tuple[str, object | None]] = []

    async def request(self, api_name: str, spec=None) -> LCUResponse:
        self.calls.append((api_name, spec))
        if not self._script:
            raise AssertionError(f"Unexpected LCU request: {api_name!r} spec={spec!r}")

        expected = self._script.pop(0)
        if expected.api_name != api_name:
            raise AssertionError(
                f"Expected {expected.api_name!r}, got {api_name!r}"
            )
        if expected.spec is not None and expected.spec != spec:
            raise AssertionError(
                f"Expected spec {expected.spec!r}, got {spec!r}"
            )

        return LCUResponse(status_code=expected.status_code, payload=expected.payload)


@pytest.fixture(autouse=True)
def fast_async_sleep(monkeypatch):
    async def noop_sleep(*_args, **_kwargs):
        return None

    monkeypatch.setattr(asyncio, "sleep", noop_sleep)


@pytest.fixture
def match_payload() -> dict:
    return json.loads(FIXTURE_PATH.read_text())


async def _fecth_game_id_returns_game_id_when_match_is_in_progress():
    connection = FakeConnection(
        [
            ScriptedResponse("GAME_FLOW", "Lobby"),
            ScriptedResponse("GAME_FLOW", "InProgress"),
            ScriptedResponse("SESSION", {"gameData": {"gameId": 695827639}}),
        ]
    )
    collector = Colloctor(connection)

    game_id = await collector.fecth_game_id()

    assert game_id == 695827639
    assert collector.phase.payload == "InProgress"


def test_fecth_game_id_returns_game_id_when_match_is_in_progress():
    asyncio.run(_fecth_game_id_returns_game_id_when_match_is_in_progress())


async def _fecth_game_id_raises_when_session_missing_game_id():
    connection = FakeConnection(
        [
            ScriptedResponse("GAME_FLOW", "InProgress"),
            ScriptedResponse("SESSION", {"gameData": {}}),
        ]
    )
    collector = Colloctor(connection)

    with pytest.raises(error.InvalidSummonerPayloadError, match="Incomplete Payload"):
        await collector.fecth_game_id()


def test_fecth_game_id_raises_when_session_missing_game_id():
    asyncio.run(_fecth_game_id_raises_when_session_missing_game_id())


async def _fecth_game_id_raises_when_game_id_is_empty():
    connection = FakeConnection(
        [
            ScriptedResponse("GAME_FLOW", "InProgress"),
            ScriptedResponse("SESSION", {"gameData": {"gameId": 0}}),
        ]
    )
    collector = Colloctor(connection)

    with pytest.raises(error.InvalidSummonerPayloadError, match="Empty required fields"):
        await collector.fecth_game_id()


def test_fecth_game_id_raises_when_game_id_is_empty():
    asyncio.run(_fecth_game_id_raises_when_game_id_is_empty())


async def _get_raw_data_returns_match_after_waiting_for_stats(match_payload):
    connection = FakeConnection(
        [
            ScriptedResponse("GAME_FLOW", "InProgress"),
            ScriptedResponse("GAME_FLOW", "WaitingForStats"),
            ScriptedResponse("MATCH", match_payload, spec=695827639),
        ]
    )
    collector = Colloctor(connection)
    collector.phase = LCUResponse(status_code=200, payload="InProgress")

    data = await collector.get_raw_data(695827639)

    assert data == match_payload
    assert collector.phase.payload == "WaitingForStats"
    assert connection.calls[-1] == ("MATCH", 695827639)


def test_get_raw_data_returns_match_after_waiting_for_stats(match_payload):
    asyncio.run(_get_raw_data_returns_match_after_waiting_for_stats(match_payload))


async def _get_raw_data_raises_when_match_history_stays_empty():
    connection = FakeConnection(
        [
            ScriptedResponse("MATCH", None, spec=695827639),
            ScriptedResponse("MATCH", None, spec=695827639),
            ScriptedResponse("MATCH", "", spec=695827639),
        ]
    )
    collector = Colloctor(connection)
    collector.phase = LCUResponse(status_code=200, payload="WaitingForStats")

    with pytest.raises(error.LCUWorkflowError) as exc_info:
        await collector.get_raw_data(695827639, attempts=3)

    message = str(exc_info.value)
    assert "695827639" in message
    assert "3 attempts" in message
    assert len([call for call in connection.calls if call[0] == "MATCH"]) == 3


def test_get_raw_data_raises_when_match_history_stays_empty():
    asyncio.run(_get_raw_data_raises_when_match_history_stays_empty())


async def _collect_match_flow_from_lobby_to_match_payload(match_payload):
    connection = FakeConnection(
        [
            ScriptedResponse("GAME_FLOW", "Lobby"),
            ScriptedResponse("GAME_FLOW", "InProgress"),
            ScriptedResponse("SESSION", {"gameData": {"gameId": 695827639}}),
            ScriptedResponse("GAME_FLOW", "InProgress"),
            ScriptedResponse("GAME_FLOW", "WaitingForStats"),
            ScriptedResponse("MATCH", match_payload, spec=695827639),
        ]
    )
    collector = Colloctor(connection)

    game_id = await collector.fecth_game_id()
    data = await collector.get_raw_data(game_id)

    assert game_id == 695827639
    assert data["gameId"] == 695827639
    assert len(data["participants"]) == 2


def test_collect_match_flow_from_lobby_to_match_payload(match_payload):
    asyncio.run(_collect_match_flow_from_lobby_to_match_payload(match_payload))
