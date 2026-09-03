from bot.actions.base import BaseAction
from bot.presenters.text import TextPresenter
from bot.services.client import CLIENT
from bot.presenters.text.user import format_linked
import logging
logger = logging.getLogger(__name__)


class LinkUserAction(BaseAction):

    def __init__(self, update, context, message):
        super().__init__(update, context, message)
        self.action_id = 3
        self.client = CLIENT["http"]



    async def play(self):

        presenter = TextPresenter(self.message)

        if not self.context.args : 
            presenter.text = "No linking token was provided."
            await presenter.present()

        assert  self.context.args

        user = self.update.effective_user
        assert user

        token =  self.context.args[0] 
        body : dict = {"token" : f'telegram_link:{token}' ,"tgId" : user.id}
        payload = await self.client.post("user/register/link/complete" , body)

        text = format_linked(payload)
        presenter.text = text

        await presenter.present()








    





            

            






    

    








    
        

        

   












