from unittest.mock import MagicMock, patch

import pytest
import requests

from api import ClientRequests
from lcu import error
from tests.conftest import load_seed_payload

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


@patch("api.requests.post")
def test_client_requests_post_returns_server_response_on_success(mock_post):
    payload = load_seed_payload()
    body = {"id": "42", "status": "PENDING", "duplicate": False}
    mock_post.return_value = _mock_response(status_code=202, json_body=body)

    result = ClientRequests(payload).post()

    mock_post.assert_called_once_with(INGEST_URL, json=payload, timeout=10)
    assert result.status_code == 202
    assert result.response_msg == body


@patch("api.requests.post")
def test_client_requests_post_raises_backend_request_error_on_transport_failure(
    mock_post,
):
    mock_post.side_effect = requests.ConnectionError("connection refused")

    with pytest.raises(error.BackendRequestError, match=INGEST_URL):
        ClientRequests(load_seed_payload()).post()


@patch("api.requests.post")
@pytest.mark.parametrize("status_code", [400, 500])
def test_client_requests_post_raises_backend_response_error_on_http_error(
    mock_post, status_code
):
    mock_post.return_value = _mock_response(
        status_code=status_code,
        json_body={"error": "bad request"},
    )

    with pytest.raises(error.BackendReponseCodeError, match=str(status_code)):
        ClientRequests(load_seed_payload()).post()


@patch("api.requests.post")
def test_client_requests_post_raises_backend_response_parse_error_on_invalid_json(
    mock_post,
):
    mock_post.return_value = _mock_response(status_code=202, text="not json")

    with pytest.raises(error.BackendResponseParseError, match="not valid JSON"):
        ClientRequests(load_seed_payload()).post()
