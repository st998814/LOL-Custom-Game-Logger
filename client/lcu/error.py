class LCUError(Exception):
    """Base exception for all LCU client errors."""
    pass


class CredentialsParsingError(LCUError):
    """LCU credential discovery failed before any request was made."""

    DEFAULT_MESSAGE = (
        "League client is not running or LCU credentials are unavailable. "
        "Open League, log in, then restart the capture client."
    )

    def __init__(self, message: str | None = None):
        super().__init__(message or self.DEFAULT_MESSAGE)


class LCURequestError(LCUError):
    """Transport-level failure when sending request to LCU."""
    pass


class LCUResponseParseError(LCUError):
    """LCU response was received but could not be parsed."""
    pass


class LCUWorkflowError(LCUError):
    """Higher-level workflow failure in connection/collector logic."""

    DEFAULT_MESSAGE = (
        "Match snapshot was unavailable from LCU after the game ended. "
        "The client will keep waiting for the next game."
    )

    def __init__(self, message: str | None = None):
        super().__init__(message or self.DEFAULT_MESSAGE)


class InvalidSummonerPayloadError(Exception):
    pass


class BackendError(Exception):
    pass


class BackendRequestError(BackendError):
    pass


class BackendResponseError(BackendError):
    pass


class BackendResponseParseError(BackendError):
    pass


class BootstrapError(Exception):
    pass

class InvalidStateError(Exception):
    pass