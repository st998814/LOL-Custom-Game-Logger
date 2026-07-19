from __future__ import annotations

from telegram.ext import Application, CommandHandler

from clients.api_client import StatsApiClient
from config.player_map import load_player_map
from config.settings import Settings, load_settings
from handlers.stats import make_stats_handler, test_command
from services.stats_service import StatsService


def build_application(settings: Settings | None = None) -> Application:
    resolved = settings or load_settings()
    player_map = load_player_map(resolved.player_map_path)
    client = StatsApiClient(resolved.api_base_url)
    stats_service = StatsService(client, player_map)

    application = (
        Application.builder()
        .token(resolved.telegram_bot_token)
        .build()
    )
    application.add_handler(CommandHandler("test", test_command))
    application.add_handler(CommandHandler("stats", make_stats_handler(stats_service)))
    return application
