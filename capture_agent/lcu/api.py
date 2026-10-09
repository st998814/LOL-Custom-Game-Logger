from dataclasses import dataclass ,field

@dataclass(frozen = True)
class Credentials:
    port : int 
    token : str 
@dataclass
class URLs:
    credentials: Credentials
    base: str = field(init=False)
    suffix: dict = field(default_factory=lambda: {
        "GAME_FLOW": "lol-gameflow/v1/gameflow-phase",
        "EOG": "lol-end-of-game/v1/eog-stats-block",
        "SESSION": "lol-gameflow/v1/session",
        "MATCH": "lol-match-history/v1/games/",
        "CUR_SUMMONER" : "/lol-summoner/v1/current-summoner"
    })

    def __post_init__(self):
        self.base = f"https://127.0.0.1:{self.credentials.port}/"