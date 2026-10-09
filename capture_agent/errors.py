class CaptureAgentError(Exception):
    """Base for all capture agent errors."""


class BootstrapError(CaptureAgentError):
    """Error during client bootstrap."""

class InvalidSummonerPayloadError(CaptureAgentError):
    """Error when summoner payload is invalid."""


class InvalidStateError(CaptureAgentError):
    """Operation called while the agent is in the wrong AppState."""





