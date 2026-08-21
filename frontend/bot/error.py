from telegram import Update
from telegram.ext import ContextTypes
import logging
logger = logging.getLogger(__name__)

async def error_handler(
    update: Update,
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
                "Something went wrong while processing your request."
            )


class BaseError(Exception):

    def __int__(self , message):
        self.message = message
 
class UserNotFoundError(BaseException):
    pass

class HttpRequestError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


class UnknownCommandError(Exception):
    pass







