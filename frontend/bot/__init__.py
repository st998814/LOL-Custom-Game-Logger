from __future__ import annotations
from telegram.ext import Application, CommandHandler
from bot.config import configs
from bot.handlers import handle_command
from bot.handlers import handle_error


def build_application() -> Application:
    setting = configs
    tg_token = setting.TG_BOT_API_TOKEN
    assert tg_token is not None
    application = Application.builder().token(tg_token).build()
    # command handlers
    application.add_error_handler(handle_error())
    application.add_handlers(
        handlers=(
            [
                CommandHandler("stats", handle_command("stats")),
                CommandHandler("user", handle_command("user")),
                CommandHandler("test" ,handle_command("test") ),
                CommandHandler("start" , handle_command("start"))
            ]
        )
    )
    return application
