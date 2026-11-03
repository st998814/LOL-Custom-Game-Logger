from bot.actions.stats import StatsAction
from bot.actions.test import TestReturnUserIDAction
from bot.actions.user import LinkUserAction

ACTIONS = {
    "test": {"": TestReturnUserIDAction},
}

SPECIAL_ACTIONS = {
    "start": LinkUserAction,
    "stats": StatsAction,
}
