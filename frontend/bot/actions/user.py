import logging
from bot.services.client import  CLIENT
from bot.error import HttpRequestError
from bot.presenters.text.user import format_registered
from bot.actions.base import BaseAction
from bot.presenters.text import TextPresenter


logger = logging.getLogger(__name__)



class RegisterAction(BaseAction):
    def __init__(self, update, context,message):
        super().__init__(update, context,message)
        self.client  = CLIENT["http"]
        
        

    async def play(self):

        user = self.update.effective_user
        assert user is not None

        try:  
            payload = await self.client.post(
                "user/register", body={"telegramId": user.id}
            )

            text = format_registered(payload)

            presenter = TextPresenter(self.message ,text)

            await presenter.present()

        except HttpRequestError as e:
            logger.critical(f"{e}")


    
        

        

   












