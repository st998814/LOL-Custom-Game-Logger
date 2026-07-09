import type { Request, Response } from 'express';
import {
  buildIngestAcceptedBody,
  mapIngestError,
} from './ingestHttp.js';
import { ingestRawEvent } from '../services/rawEvent.service.js';

/**
 * POST /api/events response contract (REQ-SRV-01):
 * - 202 { id, status } — new snapshot queued (no duplicate field)
 * - 400 { error, code } — validation failure
 * - 409 { error, code, existingId? } — duplicate snapshot (front guard or P2002 race)
 */
async function receiveRawEventController(req: Request, res: Response) {
  try {
    const { event } = await ingestRawEvent(req.body);

    console.log(`Raw data received, ID: ${event.id}`);
    return res.status(202).json(buildIngestAcceptedBody(event));
  } catch (error) {
    const mapped = mapIngestError(error);

    if (mapped) {
      return res.status(mapped.status).json(mapped.body);
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
