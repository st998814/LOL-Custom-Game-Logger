from bot.actions.user import RegisterAction
from bot.actions.test import TestReturnUserIDAction


ACTION = {
   "user":{"register": RegisterAction} , "test":{"":TestReturnUserIDAction}

   }

