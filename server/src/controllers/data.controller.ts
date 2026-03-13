import type { Request, Response } from 'express';
import { ingestRawEvent } from '../services/rawEvent.service.js';

async function receiveRawEventController(req: Request, res: Response) {
  try {
    const { event, duplicate } = await ingestRawEvent(req.body);

    const responseBody = {
      id: event?.id?.toString(),
      status: event?.status ?? 'PENDING',
      duplicate,
    };

    // Fast, lightweight acknowledgement – processing happens asynchronously
    return res.status(202).json(responseBody);
  } catch (error) {
    // Minimal logging here; detailed logging can live in a middleware/logger
    // eslint-disable-next-line no-console
    console.error('Failed to ingest raw event', error);

    return res.status(400).json({
      error: 'Invalid payload or failed to store raw event',
    });
  }
}

export default receiveRawEventController;
