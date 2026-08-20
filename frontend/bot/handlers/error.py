import logging
from telegram import Update
from telegram.ext import ContextTypes


logger = logging.getLogger(__name__)

async def error_handler(
        update: object,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        logger.error(
            "Unhandled exception",
            exc_info=context.error,
        )

        if isinstance(update, Update):
            message = update.effective_message

            if message is not None:
                await message.reply_text(
                     # keep it static for now
                    "Something went wrong while processing your request."
                )

    

