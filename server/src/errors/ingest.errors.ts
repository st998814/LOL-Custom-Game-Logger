class IngestValidationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'IngestValidationError';
    this.code = code;
  }
}

class DuplicateSnapshotError extends Error {
  readonly code = 'DUPLICATE_SNAPSHOT' as const;
  readonly existingId?: bigint;

  constructor(message: string, existingId?: bigint) {
    super(message);
    this.name = 'DuplicateSnapshotError';
    if (existingId !== undefined) {
      this.existingId = existingId;
    }
  }
}

export { IngestValidationError, DuplicateSnapshotError };
