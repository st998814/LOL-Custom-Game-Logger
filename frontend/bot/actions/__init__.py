from bot.actions.test import TestReturnUserIDAction
from bot.actions.user import LinkUserAction

# ACTION = {"test":{"":TestReturnUserIDAction} , "start":{"":LinkUserAction}}

ACTIONS = {
     "test": {"":TestReturnUserIDAction}
}


SPECIAL_ACTIONS = {

    "start" : LinkUserAction
}
