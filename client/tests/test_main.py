import asyncio
import logging
from unittest.mock import MagicMock, patch

import main
from tests.conftest import load_lcu_match_raw, make_multi_player_lcu_snapshot

INGEST_URL = "http://127.0.0.1:7871/api/events"


def _mock_response(*, status_code: int, json_body=None, text: str = ""):
    response = MagicMock()
    response.status_code = status_code
    if json_body is not None:
        response.json.return_value = json_body
    else:
        response.json.side_effect = ValueError("No JSON")
    response.text = text
    return response


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


@patch("api.requests.post")
def test_run_sends_match_snapshot_and_returns_ready_on_success(
    mock_post, monkeypatch, caplog
):
    caplog.set_level(logging.INFO)
    client = main.Client("0.0.1", port=1, token="test-token")
    client.state = main.AppState.READY
    server_body = {"id": "42", "status": "PENDING", "duplicate": False}
    mock_post.return_value = _mock_response(status_code=202, json_body=server_body)

    async def fake_collect(self):
        return load_lcu_match_raw()

    monkeypatch.setattr(main.Client, "collect_match_payload", fake_collect)

    asyncio.run(client.run())

    assert client.state == main.AppState.READY
    assert "Match payload sent successfully" in caplog.text
    mock_post.assert_called_once()
    assert mock_post.call_args.args == (INGEST_URL,)
    assert mock_post.call_args.kwargs["timeout"] == 10
    payload = mock_post.call_args.kwargs["json"]
    assert payload["eventType"] == "MATCH_SNAPSHOT"
    assert payload["match"] == {
        "game_id": 695827639,
        "game_duration": 628,
        "game_creation_date": "2026-03-16T12:32:09.240Z",
    }
    assert len(payload["players"]) == 2
    for player in payload["players"]:
        assert {
            "participant_id",
            "team_id",
            "puuid",
            "game_name",
            "tag_line",
            "champion_id",
            "first_blood",
            "first_tower",
            "total_cs",
        }.issubset(player.keys())


@patch("api.requests.post")
def test_run_sets_failed_when_backend_send_returns_http_error(
    mock_post, monkeypatch, caplog
):
    caplog.set_level(logging.ERROR)
    client = main.Client("0.0.1", port=1, token="test-token")
    client.state = main.AppState.READY
    mock_post.return_value = _mock_response(
        status_code=500,
        json_body={"error": "internal error"},
    )

    async def fake_collect(self):
        return load_lcu_match_raw()

    monkeypatch.setattr(main.Client, "collect_match_payload", fake_collect)

    asyncio.run(client.run())

    assert client.state == main.AppState.FAILED
    assert "Failed to send payload to backend" in caplog.text
    assert "unexpected status code 500" in caplog.text
