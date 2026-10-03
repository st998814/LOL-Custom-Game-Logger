from errors import CaptureAgentError


class LocalStoreError(CaptureAgentError):
    """Snapshot could not be written to or read from local storage."""
