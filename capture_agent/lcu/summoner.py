from lcu.side_client import SideClient
from dataclasses import dataclass
from lcu.error import LCURequestError , LCUUnreachableError , LCUAuthError , LCUNotReadyError

@dataclass(frozen=True)
class CurrentSummoner:
    puuid : str
    game_name : str
    tagline : str

async def verify_connection(connection: SideClient) -> CurrentSummoner:
    try:
        response = await connection.request("CUR_SUMMONER")
    except LCURequestError as e:
        raise LCUUnreachableError("LCU is not reachable") from e
    
    if response.status_code in (401, 403):
        raise LCUAuthError("LCU rejected credentials (stale token?)")

    if response.status_code != 200:
        raise LCUNotReadyError(f"LCU not ready (status {response.status_code})")

    payload = response.payload

    puuid = payload.get("puuid")
    game_name = payload.get("gameName")
    tag_line = payload.get("tagLine")
    if not (puuid and game_name and tag_line):
        raise LCUNotReadyError("Summoner not logged in yet")
    
    return CurrentSummoner(puuid=puuid, game_name=game_name, tagline=tag_line)





    
    





