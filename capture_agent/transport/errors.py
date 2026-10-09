from errors import CaptureAgentError


class LocalStoreError(CaptureAgentError):
    """Snapshot could not be written to or read from local storage."""


class SinkUnavailableError(CaptureAgentError):
    """A sink could not deliver the snapshot right now; the caller may fall back.

    Every SnapshotSink implementation must raise this (and only this) for
    delivery failures, so DeliveryService never depends on sink internals
    such as HTTP errors.
    """
