from typing import Any
from bot.presenters.text import _display_name


def format_registered( response : dict[str, Any]):

    if "error" in response:
        error_msg = response.get("error")
        return f'Something went wrong : {error_msg}'
    
    lodged = response.get("idExisted")
    game_name = response.get("gameName")
    tag = response.get("tagLine")
    game_played  = response.get("gamePlayed")

    if lodged :
        return f'Hi {_display_name(game_name,tag)} , you have {game_played} match(es) lodged ... How can I help you '

    return "First Time ? Install the lodger by https:...."