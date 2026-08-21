from typing import Any
from bot.presenters.text import _display_name


def format_registered( payload : dict[str, Any]):

    lodged : bool = payload.idExisted
    game_name = payload.get("gameName")
    tag = payload.get("tagLine")
    game_played : int = payload.get("gamePlayed")

    if lodged :
        return f'Hi {_display_name(game_name,tag)} , you have {game_played} match(es) lodged ... How can I help you '

    return "First Time ? Install the lodger by https:...."