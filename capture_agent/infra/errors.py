from errors import CaptureAgentError


class TransportError(CaptureAgentError):
    """Base for failures talking to an external HTTP service."""


class HttpConnectionError(TransportError):
    """Request never got a response (refused, DNS, timeout)."""


class HttpStatusError(TransportError):
    """Server answered with a 4xx/5xx status."""

    def __init__(self, status: int, message: str):
        super().__init__(f"HTTP {status}: {message}")
        self.status = status
        self.message = message


class HttpResponseParseError(TransportError):
    """Server answered successfully but the body is not valid JSON."""
