from typing import Any
from bot.presenters.text import _short_date , _display_name


def format_all_time(payload: dict[str, Any]) -> str:
    name = _display_name(payload.get("gameName"), payload.get("tagLine"))
    wins = payload.get("wins", 0)
    losses = payload.get("losses", 0)
    return f"{name}\nAll-time record: {wins}–{losses}"


def format_recent(payload: dict[str, Any]) -> str:
    matches = payload.get("matches") or []
    if not matches:
        name = _display_name(payload.get("gameName"), payload.get("tagLine"))
        return f"{name}\nNo recent duels found."

    lines = ["Recent duels (last 5):"]
    for match in matches:
        lines.append(_format_match_line(match))
    return "\n".join(lines)


def format_details(payload: dict[str, Any]) -> str:
    sections: list[str] = []

    by_opponent = payload.get("byOpponent") or []
    if by_opponent:
        sections.append("By opponent:")
        for row in by_opponent:
            opponent = row.get("opponent") or {}
            name = _display_name(opponent.get("gameName"), opponent.get("tagLine"))
            sections.append(
                f"• {name}: {row.get('wins', 0)}–{row.get('losses', 0)}"
            )

    matches = payload.get("matches") or []
    if matches:
        if sections:
            sections.append("")
        sections.append("All matches:")
        for match in matches:
            sections.append(_format_match_line(match))

    if not sections:
        name = _display_name(payload.get("gameName"), payload.get("tagLine"))
        return f"{name}\nNo duel history found."

    return "\n".join(sections)


def format_unmapped(telegram_user_id: int) -> str:
    return (
        "Your Telegram account is not linked to a ledger puuid yet.\n"
        f"Ask the host to add Telegram user id {telegram_user_id} "
        "to config/player_map.json (see player_map.json.example)."
    )


def format_usage() -> str:
    return (
        "Usage:\n"
        "/stats — all-time W–L\n"
        "/stats recent — last 5 duels\n"
        "/stats details — all-time detail"
    )


def format_api_error(status: int, message: str) -> str:
    if status == 404:
        return "No player found for your mapped puuid in the ledger."
    if status == 0:
        return f"Stats API unreachable. {message}"
    return f"Stats request failed ({status}): {message}"


def _format_match_line(match: dict[str, Any]) -> str:
    opponent = match.get("opponent") or {}
    opponent_name = _display_name(
        opponent.get("gameName"),
        opponent.get("tagLine"),
    )
    outcome = "Won" if match.get("won") else "Lost"
    when = _short_date(match.get("gameCreationDate"))
    my_champ = match.get("myChampionId")
    opp_champ = match.get("opponentChampionId")
    line = (
        f"• vs {opponent_name} — {outcome}"
        f" · champs {my_champ}/{opp_champ}"
        f" · {when}"
    )
    win_reason = match.get("winReason")
    if win_reason:
        line = f"{line} · {win_reason}"
    return line





