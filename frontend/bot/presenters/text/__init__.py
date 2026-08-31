from typing import Any
from bot.presenters import BasePresenter


class TextPresenter(BasePresenter):

    def __init__(self, effective_message , text):
        super().__init__(effective_message)
        self.text  = text 


    async def present(self)->None:

        await self.effective_message.reply_text(self.text)

    # TODO : text setter
    @property
    def text(self):
        return self.text

    @text.setter
    def text(self,value :str):
        self.text = value

    


        
# format helper
def _display_name(game_name: Any, tag_line: Any) -> str:
    name = str(game_name).strip() if game_name else ""
    tag = str(tag_line).strip() if tag_line else ""
    if name and tag:
        return f"{name}#{tag}"
    if name:
        return name
    return "Unknown player"


def _short_date(value: Any) -> str:
    if not isinstance(value, str) or not value:
        return "unknown date"
    # ISO → YYYY-MM-DD
    return value[:10]




    

