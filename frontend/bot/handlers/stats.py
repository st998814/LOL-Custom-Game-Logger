from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.stats_service import StatsService


def make_stats_handler(stats_service: StatsService):
    async def stats_command(
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if update.effective_user is None or update.effective_message is None:
            return

        args = context.args or []
        subcommand = args[0].lower() if args else None
        text = await stats_service.handle(update.effective_user.id, subcommand)
        await update.effective_message.reply_text(text)

    return stats_command


async def test_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.effective_message is None:
        return
    await update.effective_message.reply_text("testing")
