from typing import Any

LINK_ERROR_MESSAGES = {
    "NOT_REGISTERED": (
        "Your first game is still being processed. "
        "Wait a moment, then open the link again."
    ),
    "LINK_EXPIRED": (
        "This link has expired. Restart the capture agent to get a new QR code."
    ),
    "ALREADY_LINKED": "This League account is already linked.",
    "TG_ALREADY_LINKED": (
        "Your Telegram account is already linked to a League account."
    ),
    "INVALID_INPUT": (
        "This link is invalid. Scan the QR code from the capture agent again."
    ),
}


def format_linked(response: dict[str, Any]) -> str:
    game_name = response.get("gameName")
    return f'Welcome! {game_name}  , you can now access your ledger by command '


def format_link_error(code: str | None) -> str | None:
    """Friendly text for a known link error code; None for anything else."""
    return LINK_ERROR_MESSAGES.get(code) if code else None
