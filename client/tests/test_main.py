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
