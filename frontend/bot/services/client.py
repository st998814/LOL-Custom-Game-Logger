# async http client
import aiohttp
from frontend.bot.error import ApiError
class HttpClient : 

    def __init__(self, base_url: str = None, timeout_seconds: int = 10):
        self.base_url = base_url
        # Define a total timeout limit for requests
        self.timeout = aiohttp.ClientTimeout(total=timeout_seconds)
        self._session: aiohttp.ClientSession | None = None

    async def get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                base_url=self.base_url, 
                timeout=self.timeout
            )
        return self._session

    async def post(self, path: str, body: dict):
        session = await self.get_session()

        async with session.post(path, json=body) as response:
            payload = await response.json(content_type=None)

            if response.status >= 400:
                message = payload.get("error", "Request failed") if isinstance(payload, dict) else "Request failed"
                raise ApiError(response.status, message)

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
                raise ApiError(response.status, message)

            return payload

    async def close(self):
        """Closes the underlying session cleanly."""
        if self._session and not self._session.closed:
            await self._session.close()


    








