import asyncio
import logging

import main
from tests.conftest import make_multi_player_lcu_snapshot


class FailingCredential:
    def __init__(self, inspector):
        pass

    def parse(self):
        raise main.error.CredentialsParsingError()


def test_main_returns_failure_when_credentials_are_unavailable(monkeypatch, caplog):
    monkeypatch.setattr(main, "LCUCredential", FailingCredential)
    caplog.set_level(logging.CRITICAL)

    exit_code = asyncio.run(main.main())

    assert exit_code == 1
    assert "LCU credential discovery failed" in caplog.text
    assert "League client is not running" in caplog.text
    assert "--remoting-auth-token" not in caplog.text


def test_run_returns_ready_when_match_snapshot_unavailable(monkeypatch, caplog):
    caplog.set_level(logging.ERROR)
    client = main.Client("0.0.1", port=1, token="test-token")
    client.state = main.AppState.READY

    async def fake_collect(self):
        raise main.error.LCUWorkflowError(
            "Match snapshot for game 695827639 was unavailable from LCU match-history "
            "after 5 attempts."
        )

    monkeypatch.setattr(main.Client, "collect_match_payload", fake_collect)

    asyncio.run(client.run())

    assert client.state == main.AppState.READY
    assert "Failed to collect match snapshot" in caplog.text
    assert "695827639" in caplog.text


def test_run_returns_ready_when_match_is_not_a_duel(monkeypatch, caplog):
    caplog.set_level(logging.WARNING)
    client = main.Client("0.0.1", port=1, token="test-token")
    client.state = main.AppState.READY
    non_duel_snapshot = make_multi_player_lcu_snapshot(5)

    async def fake_collect(self):
        return non_duel_snapshot

    send_called = {"value": False}

    def fake_send(self, payload):
        send_called["value"] = True
        return {"status": "ok"}

    monkeypatch.setattr(main.Client, "collect_match_payload", fake_collect)
    monkeypatch.setattr(main.Client, "send_payload", fake_send)

    asyncio.run(client.run())

    assert client.state == main.AppState.READY
    assert send_called["value"] is False
    assert "Skipping non-duel match snapshot" in caplog.text
    assert "participants=5" in caplog.text
