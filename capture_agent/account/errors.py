from errors import CaptureAgentError


class AccountError(CaptureAgentError):
    """Base for failures talking to the server's user account endpoints."""


class AccountUnavailableError(AccountError):
    """Account endpoint unreachable, answered unexpectedly, or sent a bad payload.

    Account checks are a soft dependency: callers log this and keep capturing.
    """


class AlreadyLinkedError(AccountError):
    """The server refused a link request because the PUUID already has a Telegram id."""
