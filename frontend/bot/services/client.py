# async http client
import aiohttp
from bot.error import HttpRequestError
from bot.config import configs

BASE_URL = configs.API_BASE_URL


class BaseClient:
    pass


class HttpClient(BaseClient):

    def __init__(self, timeout_seconds: int = 10):
        
        self._base_url = BASE_URL
        print(repr(self._base_url))
        print(repr(configs.API_BASE_URL))
        print(repr(BASE_URL))
        # Define a total timeout limit for requests
        self.timeout = aiohttp.ClientTimeout(total=timeout_seconds)
        self._session: aiohttp.ClientSession | None = None

    async def get_session(self) -> aiohttp.ClientSession:


        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                base_url=self._base_url, timeout=self.timeout
            )
        return self._session

    async def post(self, path: str, body: dict):
        session = await self.get_session()

        async with session.post(path, json=body) as response:
            payload = await response.json(content_type=None)

            code = response.status

            if code >= 400:
                message = (
                    payload.get("error", "Request failed")
                    if isinstance(payload, dict)
                    else "Request failed"
                )
                raise HttpRequestError(response.status, message)

            return payload

    async def get(self, path: str, params: dict[str, str] | None = None):
        session = await self.get_session()

        async with session.get(path, params=params) as response:
            payload = await response.json(content_type=None)

            if response.status >= 400:
                message = (
                    payload.get("error", "Request failed")
                    if isinstance(payload, dict)
                    else "Request failed"
                )
                raise HttpRequestError(response.status, message)

            return payload

    async def close(self):
        """Closes the underlying session cleanly."""
        if self._session and not self._session.closed:
            await self._session.close()


CLIENT = {"http": HttpClient()}
