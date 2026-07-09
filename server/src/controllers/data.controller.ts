import type { Request, Response } from 'express';
import {
  DuplicateSnapshotError,
  IngestValidationError,
} from '../errors/ingest.errors.js';
import { ingestRawEvent } from '../services/rawEvent.service.js';

async function receiveRawEventController(req: Request, res: Response) {
  try {
    const { event } = await ingestRawEvent(req.body);

    const responseBody = {
      id: event.id.toString(),
      status: event.status,
    };

    // Fast, lightweight acknowledgement – processing happens asynchronously
    console.log(`Raw data recieved , ID : ${event.id}`);
    return res.status(202).json(responseBody);
  } catch (error) {
    if (error instanceof DuplicateSnapshotError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
        ...(error.existingId !== undefined && {
          existingId: error.existingId.toString(),
        }),
      });
    }

    if (error instanceof IngestValidationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    // eslint-disable-next-line no-console
    console.error('Failed to ingest raw event', error);

    return res.status(400).json({
      error: 'Invalid payload or failed to store raw event',
      code: 'INGEST_FAILED',
    });
  }
}

export default receiveRawEventController;
