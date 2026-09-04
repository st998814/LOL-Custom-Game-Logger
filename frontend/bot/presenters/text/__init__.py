from typing import Any
from bot.presenters import BasePresenter


class TextPresenter(BasePresenter):

    def __init__(self, effective_message , text = None):
        super().__init__(effective_message)
        self._text  = text 


    async def present(self)->None:

        await self.effective_message.reply_text(self.text)

    # TODO : text setter
    @property
    def text(self):
        return self._text

    @text.setter
    def text(self,value :str):
        self._text = value

    




    

