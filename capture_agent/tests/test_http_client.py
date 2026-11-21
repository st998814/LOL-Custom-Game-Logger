import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from infra.errors import HttpStatusError
from infra.http import HttpClient


def _mock_response(*, status: int = 200, text: str = "{}"):
    response = MagicMock()
    response.status = status
    response.text = AsyncMock(return_value=text)
    response.__aenter__ = AsyncMock(return_value=response)
    response.__aexit__ = AsyncMock(return_value=None)
    return response


def test_http_client_sends_x_agent_key_when_configured():
    client = HttpClient("http://127.0.0.1:7871/api/", agent_api_key="test-secret")
    response = _mock_response(text='{"ok": true}')
    session = MagicMock()
    session.closed = False
    session.request.return_value = response

    with patch.object(client, "_get_session", return_value=session):
        payload = asyncio.run(client.post("events", {"eventType": "MATCH_SNAPSHOT"}))

    assert payload == {"ok": True}
    kwargs = session.request.call_args.kwargs
    assert kwargs["headers"] == {"X-Agent-Key": "test-secret"}
    assert kwargs["json"] == {"eventType": "MATCH_SNAPSHOT"}


def test_http_client_omits_agent_header_when_key_unset():
    client = HttpClient("http://127.0.0.1:7871/api/")
    response = _mock_response(text='{"registered": false, "linked": false}')
    session = MagicMock()
    session.closed = False
    session.request.return_value = response

    with patch.object(client, "_get_session", return_value=session):
        asyncio.run(client.get("user/status", params={"puuid": "p1"}))

    kwargs = session.request.call_args.kwargs
    assert kwargs["headers"] is None


def test_http_client_ensures_trailing_slash_on_base_url():
    client = HttpClient("http://api:7871/api")
    assert client._base_url == "http://api:7871/api/"


def test_http_client_raises_on_http_error_status():
    client = HttpClient("http://127.0.0.1:7871/api/", agent_api_key="k")
    response = _mock_response(status=401, text='{"error": "nope"}')
    session = MagicMock()
    session.closed = False
    session.request.return_value = response

    with patch.object(client, "_get_session", return_value=session):
        with pytest.raises(HttpStatusError) as exc:
            asyncio.run(client.post("events", {}))

    assert exc.value.status == 401
