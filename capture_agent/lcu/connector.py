from dataclasses import dataclass
from lcu.side_client import SideClient
from lcu.summoner import CurrentSummoner , verify_connection
from lcu.error import LCUError
import asyncio
from lcu.credential_resolver import LCUCredential


@dataclass(frozen=True)
class LcuSession:
    client: SideClient                
    summoner: CurrentSummoner


class LcuConnector:
    """
    using the side client to connect to the LCU and verify the connection
    and return the LcuSession object
    """
    def __init__(self, resolver: LCUCredential):
        self._resolver = resolver

    async def connect(self) -> LcuSession:
        port, token = await asyncio.to_thread(self._resolver.parse)
        connection = SideClient(port, token) # connection = a side client with valid creds (port , token)
        try:
            summoner = await verify_connection(connection)
        except LCUError:
            await connection.close()
            raise
        return LcuSession(client = connection, summoner=summoner)