"""Parse `/stats` arguments per DEC-003 order: keyword → date → champion id."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class StatsIntent(str, Enum):
    ALL_TIME = "all_time"
    AVERAGE = "average"
    TOPMOST = "topmost"
    CHAMPION = "champion"
    DATE = "date"
    USAGE = "usage"
    RETIRED = "retired"
    INVALID_CHAMPION = "invalid_champion"


RETIRED_KEYWORDS = frozenset({"recent", "details"})
RESERVED_KEYWORDS = frozenset({"average", "topmost"})


@dataclass(frozen=True)
class ParsedStatsArg:
    intent: StatsIntent
    champion_id: int | None = None
    date: str | None = None
    retired_command: str | None = None


def _is_valid_yy_mm_dd(token: str) -> bool:
    parts = token.split("/")
    if len(parts) != 3:
        return False
    if not all(part.isdigit() and len(part) == 2 for part in parts):
        return False
    yy, mm, dd = (int(part) for part in parts)
    year = 2000 + yy
    from datetime import date

    try:
        parsed = date(year, mm, dd)
    except ValueError:
        return False
    return parsed.year == year and parsed.month == mm and parsed.day == dd


def parse_stats_arg(raw: str) -> ParsedStatsArg:
    """
    Parse the joined `/stats` argument string.

    The command handler joins Telegram args with `/`, so
    `/stats 26 03 16` and `/stats 26/03/16` both become `26/03/16`.
    """
    token = (raw or "").strip()
    if not token:
        return ParsedStatsArg(intent=StatsIntent.ALL_TIME)

    lower = token.lower()
    if lower in RESERVED_KEYWORDS:
        return ParsedStatsArg(
            intent=StatsIntent.AVERAGE if lower == "average" else StatsIntent.TOPMOST
        )
    if lower in RETIRED_KEYWORDS:
        return ParsedStatsArg(intent=StatsIntent.RETIRED, retired_command=lower)
    if _is_valid_yy_mm_dd(token):
        return ParsedStatsArg(intent=StatsIntent.DATE, date=token)
    if token.isdigit() and int(token) > 0:
        return ParsedStatsArg(intent=StatsIntent.CHAMPION, champion_id=int(token))
    if token.isalpha() or not token.isdigit():
        # Non-numeric champion names are local rejects until REQ-BOT-06.
        return ParsedStatsArg(intent=StatsIntent.INVALID_CHAMPION)
    return ParsedStatsArg(intent=StatsIntent.USAGE)
