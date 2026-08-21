from bot.actions.base import BaseAction
from bot.presenters.text import TextPresenter


class TestReturnUserIDAction(BaseAction):
    def __init__(self, update, context,message):

        super().__init__(update, context,message)
        self.action_id = 2

    async def play(self):

        user = self.update.effective_user
        assert user is not None

        message = self.update.effective_message
        text = f'test\n user ID : {user.id}\n'
        presenter = TextPresenter(message , text)

        await presenter.present()


