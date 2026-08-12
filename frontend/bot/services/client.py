# async http client
import aiohttp

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

    async def close(self):
        """Closes the underlying session cleanly."""
        if self._session and not self._session.closed:
            await self._session.close()


    








