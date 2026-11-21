import asyncio
import json

import aiohttp

from infra.errors import HttpConnectionError, HttpResponseParseError, HttpStatusError


class HttpClient:

    def __init__(
        self,
        base_url: str,
        timeout_seconds: float = 10,
        *,
        agent_api_key: str | None = None,
    ):
        # aiohttp drops the base path for request paths with a leading "/",
        # so callers must pass relative paths such as "events".
        self._base_url = base_url if base_url.endswith("/") else f"{base_url}/"
        self._timeout = aiohttp.ClientTimeout(total=timeout_seconds)
        self._session: aiohttp.ClientSession | None = None
        self._default_headers: dict[str, str] = {}
        if agent_api_key:
            self._default_headers["X-Agent-Key"] = agent_api_key

    def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                base_url=self._base_url, timeout=self._timeout
            )
        return self._session

    def _merge_headers(self, headers: dict[str, str] | None) -> dict[str, str] | None:
        if not self._default_headers and not headers:
            return None
        merged = dict(self._default_headers)
        if headers:
            merged.update(headers)
        return merged

    async def _request(self, method: str, path: str, **kwargs):
        session = self._get_session()
        headers = self._merge_headers(kwargs.pop("headers", None))
        try:
            async with session.request(
                method, path, headers=headers, **kwargs
            ) as response:
                status = response.status
                text = await response.text()
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise HttpConnectionError(f"{method} {path} failed: {e}") from e

        try:
            payload = json.loads(text) if text else None
        except json.JSONDecodeError as e:
            if status >= 400:
                raise HttpStatusError(status, "Request failed") from e
            raise HttpResponseParseError(
                f"{method} {path} returned invalid JSON"
            ) from e

        if status >= 400:
            message = (
                payload.get("error", "Request failed")
                if isinstance(payload, dict)
                else "Request failed"
            )
            raise HttpStatusError(status, message)

        return payload

    async def post(self, path: str, body: dict):
        return await self._request("POST", path, json=body)

    async def get(self, path: str, params: dict[str, str] | None = None):
        return await self._request("GET", path, params=params)

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()
