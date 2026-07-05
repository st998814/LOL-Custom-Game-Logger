import asyncio
import logging

import main


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
