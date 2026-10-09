import asyncio
from types import SimpleNamespace

import pytest

import app as app_module
from app import AppState, CaptureAgent
from errors import BootstrapError, InvalidStateError
from lcu.error import (
    CredentialsParsingError,
    InvalidDuelError,
    LCUAuthError,
    LCUUnreachableError,
    LCUWorkflowError,
)
from services.delivery import DeliveryResult
from transport.errors import LocalStoreError


@pytest.fixture(autouse=True)
def no_bootstrap_backoff(monkeypatch):
    # Only app.py sees the instant sleep; the real asyncio stays intact so
    # the event loop can still switch tasks (needed for the cancel test).
    async def instant(*_args, **_kwargs):
        return None

    monkeypatch.setattr(
        app_module,
        "asyncio",
        SimpleNamespace(sleep=instant, CancelledError=asyncio.CancelledError),
    )


class FakeConnector:
    def __init__(self, failures: int = 0):
        self.failures = failures
        self.calls = 0

    async def connect(self):
        self.calls += 1
        if self.calls <= self.failures:
            raise CredentialsParsingError()
        return SimpleNamespace(client=f"client-{self.calls}", summoner="me")


class FakeCapture:
    def __init__(self, error: Exception | None = None):
        self.error = error
        self.clients: list = []

    async def capture(self, lcu):
        await asyncio.sleep(0)  # yield like a real LCU poll would
        self.clients.append(lcu)
        if self.error:
            raise self.error
        return {"match": {"game_id": 7}, "players": [], "eventType": "MATCH_SNAPSHOT"}


class FakeDelivery:
    def __init__(self, error: Exception | None = None):
        self.error = error
        self.delivered: list[dict] = []
        self.flushes = 0

    async def deliver(self, snapshot):
        if self.error:
            raise self.error
        self.delivered.append(snapshot)
        return DeliveryResult.SENT

    async def flush_pending(self):
        self.flushes += 1
        return 0


def make_agent(connector=None, capture=None, delivery=None) -> CaptureAgent:
    return CaptureAgent(
        version="test",
        connector=connector or FakeConnector(),
        capture=capture or FakeCapture(),
        delivery=delivery or FakeDelivery(),
    )


def bootstrapped(agent: CaptureAgent) -> CaptureAgent:
    asyncio.run(agent.bootstrap(attempts=3))
    return agent


def test_bootstrap_retries_then_ready():
    connector = FakeConnector(failures=2)
    agent = make_agent(connector=connector)

    asyncio.run(agent.bootstrap(attempts=3))

    assert agent.state is AppState.READY
    assert connector.calls == 3


def test_bootstrap_gives_up_with_failed_state():
    agent = make_agent(connector=FakeConnector(failures=99))

    with pytest.raises(BootstrapError):
        asyncio.run(agent.bootstrap(attempts=2))
    assert agent.state is AppState.FAILED


def test_bootstrap_finishes_when_cancelled():
    class HangingConnector:
        async def connect(self):
            await asyncio.Event().wait()

    agent = make_agent(connector=HangingConnector())

    async def cancel_during_bootstrap():
        task = asyncio.create_task(agent.bootstrap(attempts=3))
        await asyncio.sleep(0)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    asyncio.run(cancel_during_bootstrap())

    assert agent.state is AppState.FINISHED


def test_bootstrap_marks_failed_on_unexpected_error():
    class BrokenConnector:
        async def connect(self):
            raise RuntimeError("boom")

    agent = make_agent(connector=BrokenConnector())

    with pytest.raises(RuntimeError):
        asyncio.run(agent.bootstrap(attempts=3))
    assert agent.state is AppState.FAILED


def test_run_once_delivers_captured_snapshot():
    delivery = FakeDelivery()
    agent = bootstrapped(make_agent(delivery=delivery))

    asyncio.run(agent._run_once(bootstrap_attempts=3))

    assert [s["match"]["game_id"] for s in delivery.delivered] == [7]
    assert agent.state is AppState.READY


@pytest.mark.parametrize("error", [InvalidDuelError(), LCUWorkflowError()])
def test_run_once_skips_game_without_delivering(error):
    delivery = FakeDelivery()
    agent = bootstrapped(make_agent(capture=FakeCapture(error), delivery=delivery))

    asyncio.run(agent._run_once(bootstrap_attempts=3))

    assert delivery.delivered == []
    assert agent.state is AppState.READY


@pytest.mark.parametrize("error", [LCUUnreachableError("gone"), LCUAuthError("stale")])
def test_run_once_reconnects_when_lcu_lost(error):
    connector = FakeConnector()
    agent = bootstrapped(make_agent(connector=connector, capture=FakeCapture(error)))

    asyncio.run(agent._run_once(bootstrap_attempts=3))

    assert connector.calls == 2
    assert agent._lcu.client == "client-2"
    assert agent.state is AppState.READY


def test_run_once_is_reconnecting_while_bootstrapping_again():
    seen_states = []

    class RecordingConnector(FakeConnector):
        async def connect(self):
            seen_states.append(agent.state)
            return await super().connect()

    agent = make_agent(
        connector=RecordingConnector(), capture=FakeCapture(LCUUnreachableError("gone"))
    )
    bootstrapped(agent)

    asyncio.run(agent._run_once(bootstrap_attempts=3))

    assert seen_states == [AppState.CREATED, AppState.RECONNECTING]
    assert agent.state is AppState.READY


def test_run_once_raises_bootstrap_error_when_reconnect_fails():
    connector = FakeConnector()
    agent = bootstrapped(
        make_agent(connector=connector, capture=FakeCapture(LCUUnreachableError("gone")))
    )
    connector.failures = 99

    with pytest.raises(BootstrapError):
        asyncio.run(agent._run_once(bootstrap_attempts=2))
    assert agent.state is AppState.FAILED


def test_run_once_logs_and_continues_when_local_store_fails(caplog):
    agent = bootstrapped(make_agent(delivery=FakeDelivery(LocalStoreError("disk full"))))

    asyncio.run(agent._run_once(bootstrap_attempts=3))

    assert agent.state is AppState.READY
    assert "Game 7 lost" in caplog.text


def test_run_requires_ready_state():
    with pytest.raises(InvalidStateError):
        asyncio.run(make_agent().run())


def test_run_marks_failed_on_unexpected_error():
    agent = bootstrapped(make_agent(capture=FakeCapture(RuntimeError("boom"))))

    with pytest.raises(RuntimeError):
        asyncio.run(agent.run(bootstrap_attempts=3))
    assert agent.state is AppState.FAILED


def test_run_marks_failed_when_flush_raises():
    class BrokenFlushDelivery(FakeDelivery):
        async def flush_pending(self):
            raise RuntimeError("boom")

    agent = bootstrapped(make_agent(delivery=BrokenFlushDelivery()))

    with pytest.raises(RuntimeError):
        asyncio.run(agent.run(bootstrap_attempts=3))
    assert agent.state is AppState.FAILED


def test_run_flushes_once_then_finishes_on_cancel():
    delivery = FakeDelivery()
    agent = bootstrapped(make_agent(delivery=delivery))

    async def cancel_after_two_games():
        task = asyncio.create_task(agent.run(bootstrap_attempts=3))
        while len(delivery.delivered) < 2:
            await asyncio.sleep(0)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    asyncio.run(cancel_after_two_games())

    assert delivery.flushes == 1
    assert agent.state is AppState.FINISHED
