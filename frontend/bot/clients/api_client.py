from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


class StatsApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


class StatsApiClient:
    """HTTP client for application-tier stats read APIs."""

    def __init__(self, base_url: str, timeout_seconds: float = 10.0):
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds

    def get_all_time(self, puuid: str) -> dict[str, Any]:
        return self._get("/api/stats", {"puuid": puuid})

    def get_recent(self, puuid: str) -> dict[str, Any]:
        return self._get("/api/stats/recent", {"puuid": puuid})

    def get_details(self, puuid: str) -> dict[str, Any]:
        return self._get("/api/stats/details", {"puuid": puuid})

    def _get(self, path: str, params: dict[str, str]) -> dict[str, Any]:
        query = urllib.parse.urlencode(params)
        url = f"{self._base_url}{path}?{query}"
        request = urllib.request.Request(url, method="GET")

        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                body = response.read().decode("utf-8")
                payload = json.loads(body) if body else {}
                if not isinstance(payload, dict):
                    raise StatsApiError(500, "Stats API returned a non-object JSON body")
                return payload
        except urllib.error.HTTPError as error:
            message = _read_error_message(error)
            raise StatsApiError(error.code, message) from error
        except urllib.error.URLError as error:
            raise StatsApiError(0, f"Could not reach stats API: {error.reason}") from error


def _read_error_message(error: urllib.error.HTTPError) -> str:
    try:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else {}
        if isinstance(payload, dict) and isinstance(payload.get("error"), str):
            return payload["error"]
        return raw or error.reason
    except Exception:
        return error.reason or "Stats API request failed"
