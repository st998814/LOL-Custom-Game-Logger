import type { Request, Response } from 'express';
import { fetchRawEvent, replayRawEvent } from '../services/rawEventAdmin.service.js';

async function getRawEventByIdController(req: Request, res: Response) {
  try {
    const event = await fetchRawEvent(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Raw event not found' });
    }

    return res.status(200).json({
      ...event,
      id: event.id.toString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
}

async function replayRawEventController(req: Request, res: Response) {
  try {
    const event = await replayRawEvent(req.params.id);

    return res.status(200).json({
      id: event.id.toString(),
      status: event.status,
      retryCount: event.retryCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
}

export { getRawEventByIdController, replayRawEventController };

