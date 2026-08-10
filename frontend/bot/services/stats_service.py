from __future__ import annotations

import asyncio

from frontend.bot.client.client import StatsApiClient, StatsApiError
from presenters import stats_presenter


class StatsService:
    """Map /stats intent → API call → Telegram text (no DB access)."""

    def __init__(self, client: StatsApiClient, player_map: dict[str, str]):
        self._client = client
        self._player_map = player_map

    async def handle(self, telegram_user_id: int, subcommand: str | None) -> str:
        if subcommand is not None and subcommand not in {"recent", "details"}:
            return stats_presenter.format_usage()

        puuid = self._player_map.get(str(telegram_user_id))
        if not puuid:
            return stats_presenter.format_unmapped(telegram_user_id)

        try:
            if subcommand is None:
                payload = await asyncio.to_thread(self._client.get_all_time, puuid)
                return stats_presenter.format_all_time(payload)
            if subcommand == "recent":
                payload = await asyncio.to_thread(self._client.get_recent, puuid)
                return stats_presenter.format_recent(payload)
            payload = await asyncio.to_thread(self._client.get_details, puuid)
            return stats_presenter.format_details(payload)
        except StatsApiError as error:
            return stats_presenter.format_api_error(error.status, error.message)
