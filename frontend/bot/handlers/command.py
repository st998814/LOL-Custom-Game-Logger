from telegram import Update
from telegram.ext import ContextTypes
from bot.handlers.base import BaseOpreator
from bot.actions import ACTION


class CommandOpreator(BaseOpreator):

    def __init__(self, command, update: Update, context: ContextTypes.DEFAULT_TYPE):
        super().__init__(update, context)
        self.command  = command

        
    async def run(self):

        message = self._get_effective_message()

        action = self.get_action(self.update , self.context , message)

        await action.play()



    def get_action(self , update , context , message):

        arg = self._get_arg()  
        action  = ACTION[self.command][arg]

        return action(update , context , message)



    def _get_effective_message(self):

        message = self.update.effective_message

        return message


    def _get_arg(self)->str : 

        arg = self.context.args

        if not arg : 
            return ''
        else:
            parsed_arg = '/'.join(arg)   

        return parsed_arg









