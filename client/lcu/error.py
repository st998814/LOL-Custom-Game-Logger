class LCUError(Exception):
    """Base exception for all LCU client errors."""
    pass


class LCURequestError(LCUError):
    """Transport-level failure when sending request to LCU."""
    pass


class LCUResponseParseError(LCUError):
    """LCU response was received but could not be parsed."""
    pass


class LCUWorkflowError(LCUError):
    """Higher-level workflow failure in connection/collector logic."""
    pass