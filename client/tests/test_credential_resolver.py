from types import SimpleNamespace

import pytest

from lcu import error
from lcu.credential_resolver import LCUCredential, ProcessInspector


class FakeProcessInspector:
    def __init__(self, processes: str):
        self.processes = processes
        self.refresh_count = 0

    def refresh(self):
        self.refresh_count += 1

    def get_processes(self):
        return self.processes


def test_parse_returns_port_and_token_from_lcu_process_line():
    inspector = FakeProcessInspector(
        "123 ?? 0:00.00 /Applications/League of Legends.app/Contents/MacOS/LeagueClientUx "
        "--app-port=54321 --remoting-auth-token=secret-token\n"
    )

    port, token = LCUCredential(inspector).parse()

    assert port == 54321
    assert token == "secret-token"
    assert inspector.refresh_count == 1


def test_parse_raises_clear_error_when_credentials_are_absent():
    inspector = FakeProcessInspector("123 ?? 0:00.00 /usr/bin/python worker.py\n")

    with pytest.raises(error.CredentialsParsingError) as exc_info:
        LCUCredential(inspector).parse()

    assert "League client is not running" in str(exc_info.value)


def test_parse_rejects_partial_credentials_without_leaking_token():
    inspector = FakeProcessInspector(
        "123 ?? 0:00.00 /Applications/League of Legends.app/Contents/MacOS/LeagueClientUx "
        "--remoting-auth-token=secret-token\n"
    )

    with pytest.raises(error.CredentialsParsingError) as exc_info:
        LCUCredential(inspector).parse()

    message = str(exc_info.value)
    assert "port/token values were incomplete" in message
    assert "secret-token" not in message
    assert "--remoting-auth-token" not in message


def test_parse_uses_valid_line_when_other_processes_are_irrelevant_or_partial():
    inspector = FakeProcessInspector(
        "111 ?? 0:00.00 /bin/zsh --app-port=11111\n"
        "222 ?? 0:00.00 /Applications/League of Legends.app/Contents/MacOS/LeagueClientUx "
        "--app-port=22222 --remoting-auth-token=valid-token\n"
    )

    port, token = LCUCredential(inspector).parse()

    assert port == 22222
    assert token == "valid-token"


def test_parse_prefers_league_client_ux_over_riot_client():
    inspector = FakeProcessInspector(
        "83188 ?? S 0:00.00 /Users/Shared/Riot Games/Riot Client.app/"
        "Contents/Frameworks/Riot Client.app/Contents/MacOS/Riot Client "
        "--app-port=51147 --remoting-auth-token=riot-token\n"
        "86013 ?? S 0:00.00 /Applications/League of Legends.app/Contents/LoL/"
        "League of Legends.app/Contents/MacOS/LeagueClientUx "
        "--ux-helper-name=LeagueClientUxHelper "
        "--app-port=51315 --remoting-auth-token=league-token\n"
    )

    port, token = LCUCredential(inspector).parse()

    assert port == 51315
    assert token == "league-token"


def test_parse_ignores_league_client_ux_helper_processes():
    inspector = FakeProcessInspector(
        "86239 ?? S 0:00.00 /Applications/League of Legends.app/Contents/LoL/"
        "League of Legends.app/Contents/Frameworks/"
        "LeagueClientUx Helper.app/Contents/MacOS/LeagueClientUx Helper "
        "--type=utility --app-port=51315 --remoting-auth-token=helper-token\n"
    )

    with pytest.raises(error.CredentialsParsingError) as exc_info:
        LCUCredential(inspector).parse()

    assert "League client is not running" in str(exc_info.value)


def test_process_inspector_raises_sanitized_error_when_ps_fails(monkeypatch):
    def fake_run(*args, **kwargs):
        return SimpleNamespace(returncode=1, stdout="", stderr="secret process details")

    monkeypatch.setattr("lcu.credential_resolver.subprocess.run", fake_run)

    with pytest.raises(error.CredentialsParsingError) as exc_info:
        ProcessInspector().refresh()

    message = str(exc_info.value)
    assert "Unable to inspect running processes" in message
    assert "secret process details" not in message
