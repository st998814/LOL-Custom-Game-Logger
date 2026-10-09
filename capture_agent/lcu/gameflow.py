import asyncio
from lcu.side_client import SideClient
from lcu.error import (
    LCUResponseParseError,
    InvalidSessionPayloadError,
    LCUNotReadyError,
    LCUWorkflowError,
)
import logging

log = logging.getLogger(__name__)


IN_GAME = {"InProgress", "Reconnect"}

async def get_current_phase(lcu: SideClient) -> str:
    response = await lcu.get("GAME_FLOW")      # handles status codes + error mapping
    if not isinstance(response.payload, str):
        raise LCUResponseParseError("gameflow phase is not a string")
    return response.payload


async def wait_for_game_start(lcu: SideClient, poll_seconds: float = 1) -> int:
    last = None
    while (phase := await get_current_phase(lcu)) != "InProgress": # poll until the game starts
        if phase != last:
            log.info("Gameflow phase: %s", phase)
            last = phase
        await asyncio.sleep(poll_seconds)
    return await get_session_game_id(lcu) # return the game id


async def wait_for_game_end(lcu: SideClient, poll_seconds: float = 1) -> None:
    while await get_current_phase(lcu) in IN_GAME:
        await asyncio.sleep(poll_seconds)


async def get_session_game_id(lcu: SideClient) -> int:
    payload = (await lcu.get("SESSION")).payload
    game_data = payload.get("gameData") if isinstance(payload, dict) else None
    game_id = game_data.get("gameId") if isinstance(game_data, dict) else None
    if not isinstance(game_id, int) or game_id <= 0:
        raise InvalidSessionPayloadError("Session payload has no valid gameId")
    return game_id


async def get_match_data(lcu: SideClient, game_id: int, attempts: int = 5, delay: float = 3) -> dict:
    for attempt in range(1, attempts + 1):
        await asyncio.sleep(delay)
        try:
            payload = (await lcu.get("MATCH", game_id)).payload
        except LCUNotReadyError:
            continue
        if isinstance(payload, dict) and payload.get("gameId") == game_id:
            return payload
    raise LCUWorkflowError(
        f"Match {game_id} unavailable from match history after {attempts} attempts"
    )