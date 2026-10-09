import logging

from data.snapshot import build_match_snapshot, validate_duel_snapshot
from lcu import gameflow
from lcu.side_client import SideClient

log = logging.getLogger(__name__)


class MatchCaptureService:
    
    async def capture(self, lcu: SideClient) -> dict:
        """Wait for the next game to finish and return its MATCH_SNAPSHOT payload."""
        game_id = await gameflow.wait_for_game_start(lcu)
        log.info("Game %s started", game_id)

        await gameflow.wait_for_game_end(lcu)
        log.info("Game %s ended, fetching match data", game_id)

        raw = await gameflow.get_match_data(lcu, game_id)

        snapshot = build_match_snapshot(raw)
        return snapshot


