import type { RawEvent } from '../../generated/prisma/client.js';
import {
  DuplicateSnapshotError,
  IngestValidationError,
} from '../errors/ingest.errors.js';

type IngestAcceptedBody = {
  id: string;
  status: RawEvent['status'];
};

type IngestErrorBody = {
  error: string;
  code: string;
  existingId?: string;
};

type IngestHttpError = {
  status: 400 | 409;
  body: IngestErrorBody;
};

function buildIngestAcceptedBody(event: RawEvent): IngestAcceptedBody {
  return {
    id: event.id.toString(),
    status: event.status,
  };
}

function mapIngestError(error: unknown): IngestHttpError | null {
  if (error instanceof DuplicateSnapshotError) {
    return {
      status: 409,
      body: {
        error: error.message,
        code: error.code,
        ...(error.existingId !== undefined && {
          existingId: error.existingId.toString(),
        }),
      },
    };
  }

  if (error instanceof IngestValidationError) {
    return {
      status: 400,
      body: {
        error: error.message,
        code: error.code,
      },
    };
  }

  return null;
}

export type { IngestAcceptedBody, IngestErrorBody, IngestHttpError };
export { buildIngestAcceptedBody, mapIngestError };
