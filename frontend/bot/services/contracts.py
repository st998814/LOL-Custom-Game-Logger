# command : api_path contracts

from typing import TypedDict

class BaseContract(TypedDict):
    pass


class UserContract(BaseContract):

    register = "/api/register"


class StatsContract(BaseContract):

    alltime = "/api/stats"
    recent =  "/api/stats/recent"
    details = "/api/stats/details"














