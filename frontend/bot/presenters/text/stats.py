from __future__ import annotations

from typing import Any


WIN_REASON_LABELS = {
    "firstBlood": "first blood",
    "firstTower": "first tower",
    "cs": "100 CS",
}


def _display_name(game_name: Any, tag_line: Any) -> str:
    name = (game_name or "").strip() if isinstance(game_name, str) else ""
    tag = (tag_line or "").strip() if isinstance(tag_line, str) else ""
    if name and tag:
        return f"{name}#{tag}"
    if name:
        return name
    return "Linked player"


def _format_duration(seconds: Any) -> str:
    try:
        total = int(seconds)
    except (TypeError, ValueError):
        total = 0
    if total < 0:
        total = 0
    minutes, secs = divmod(total, 60)
    return f"{minutes}:{secs:02d}"


def _format_percent(value: Any) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = 0.0
    if number == int(number):
        return f"{int(number)}%"
    return f"{number:.1f}%"


def format_all_time(payload: dict[str, Any]) -> str:
    name = _display_name(payload.get("gameName"), payload.get("tagLine"))
    wins = payload.get("wins", 0)
    losses = payload.get("losses", 0)
    return f"{name}\nYour all time record is {wins}-{losses}"


def format_average(payload: dict[str, Any]) -> str:
    name = _display_name(payload.get("gameName"), payload.get("tagLine"))
    win_rate = _format_percent(payload.get("winRate", 0))
    duration = _format_duration(payload.get("avgDurationSec", 0))
    fb = _format_percent(payload.get("avgFirstBloodRate", 0))
    ft = _format_percent(payload.get("avgFirstTowerRate", 0))
    avg_cs = payload.get("avgCs", 0)
    return (
        f"{name}\n"
        f"Your all time win rate: {win_rate}, with {duration} game duration, "
        f"{ft} first tower, {fb} first blood and {avg_cs} CS average in a game"
    )


def format_topmost(payload: dict[str, Any]) -> str:
    name = _display_name(payload.get("gameName"), payload.get("tagLine"))
    champ = payload.get("mostSelectedChampionId")
    reason = payload.get("mostCommonWinReason")

    if champ is None and reason is None:
        return f"{name}\nNo topmost stats yet — play a few duels first."

    parts: list[str] = []
    if champ is not None:
        parts.append(f"most selected champion: {champ}")
    else:
        parts.append("most selected champion: none")

    if reason is not None:
        label = WIN_REASON_LABELS.get(str(reason), str(reason))
        parts.append(f"most win reason: {label}")
    else:
        parts.append("most win reason: none")

    return f"{name}\n" + ", ".join(parts)


def format_champion(payload: dict[str, Any]) -> str:
    name = _display_name(payload.get("gameName"), payload.get("tagLine"))
    champion_id = payload.get("championId")
    games = payload.get("games", 0)
    wins = payload.get("wins", 0)
    losses = payload.get("losses", 0)
    reasons = payload.get("winReasons") or {}
    fb = reasons.get("firstBlood", 0)
    ft = reasons.get("firstTower", 0)
    cs = reasons.get("cs", 0)
    return (
        f"{name}\n"
        f"You have {games} games using {champion_id}, with the record of "
        f"{wins}-{losses}, win by {fb}/{ft}/{cs} (first blood, first tower, 100 CS)"
    )


def format_date(payload: dict[str, Any]) -> str:
    name = _display_name(payload.get("gameName"), payload.get("tagLine"))
    date = payload.get("date", "")
    games = payload.get("games", 0)
    wins = payload.get("wins", 0)
    losses = payload.get("losses", 0)
    return (
        f"{name}\n"
        f"You have played {games} games in {date}, with the record of {wins}-{losses}"
    )


def format_unlinked() -> str:
    return (
        "Your Telegram account is not linked to a ledger player yet.\n"
        "Open /start <token> from the capture agent QR code to link, "
        "then try /stats again."
    )


def format_usage() -> str:
    return (
        "Usage:\n"
        "/stats — all-time W–L\n"
        "/stats average — win rate, duration, FB/FT rates, avg CS\n"
        "/stats topmost — most-selected champion + win reason\n"
        "/stats <championId> — per-champion games / W–L / win reasons\n"
        "/stats <yy/mm/dd> — games + W–L for that UTC day"
    )


def format_invalid_champion() -> str:
    return (
        "Champion names are not supported yet. Use a numeric champion id, "
        "for example: /stats 54\n\n" + format_usage()
    )


def format_retired(command: str) -> str:
    return (
        f"/stats {command} is retired.\n"
        "Use /stats, /stats average, /stats topmost, "
        "/stats <championId>, or /stats <yy/mm/dd> instead."
    )


def format_api_error(status: int, message: str) -> str:
    if status == 404:
        return format_unlinked()
    if status == 0:
        return f"Stats API unreachable. {message}"
    return f"Stats request failed ({status}): {message}"
