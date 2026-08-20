import logging
from telegram import Update
from telegram.ext import ContextTypes
from bot.handlers.command import CommandOpreator
from bot.handlers.error import error_handler

logger = logging.getLogger(__name__)


def handle_command(command: str):

    async def callback(update:Update, context: ContextTypes.DEFAULT_TYPE) -> None:

        logger.info(f'Handler /{command} being called...')
        opreator = CommandOpreator(command,update, context)

        await opreator.run()

    return callback



def handle_error():

    async def callback (update:object, context: ContextTypes.DEFAULT_TYPE) -> None:
        
        await error_handler(update , context)

    return callback





        



    