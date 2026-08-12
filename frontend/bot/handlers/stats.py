from __future__ import annotations
from dataclasses import dataclass
import logging
from telegram import Update , Message
from telegram.ext import ContextTypes
from frontend.bot.services.stats import StatsService
from frontend.utlis.logger import configure_logging
logger = logging.getLogger(__name__)

configure_logging()

def make_stats_handler(stats_service: StatsService):
    async def stats_command(
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:

        id = get_tg_user_id_from_update(update)
        command = parse_command(context)
        text = await stats_service.handle(id, command)

        await update.effective_message.reply_text(text)

    return stats_command




def get_tg_user_id_from_update(update:Update) -> int:
    id  =  update.effective_user.id
    if not id : 
        logger.error("Fail to get sender's id")
        return
    
    return id

def parse_command(context:ContextTypes.DEFAULT_TYPE) -> str | None:

    command = context.args[0].lower()
    if not command:
        return None
    
    return command









    





