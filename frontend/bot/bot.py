from telegram import Update , ReplyKeyboardMarkup , InlineKeyboardMarkup , InlineKeyboardButton  , CallbackQuery
from telegram.ext import Application , CommandHandler , ContextTypes , CallbackQueryHandler
import asyncio

TOKEN = "8597771984:AAHxJoKn-t20amz-s_y6E74L4PYyYtrtOGw"

app = Application.builder().token(TOKEN).build()


class TextCommand :
    def __init__(self , text:str):
        self.text = text

    async def __call__(self,update:Update , context: ContextTypes.DEFAULT_TYPE):
        await context.bot.send_message(chat_id=update.effective_chat.id, text=self.text)


class Handler:
    def __init__(self, command , callback):
        self.handler = CommandHandler(command , callback)

    def register (self, app):
        app.add_handler(self.handler)

    

test_handler , show_handler = Handler("test" , TextCommand("testing")) , Handler("show" , TextCommand("show the all-time match result")) 

test_handler.register(app)
show_handler.register(app)



















