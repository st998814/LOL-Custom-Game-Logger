import type { RawEvent } from '../../generated/prisma/client.js';
import {
  getRawEventById,
  resetEventForReplay,
} from '../models/rawEvent.model.js';

async function fetchRawEvent(idParam: string): Promise<RawEvent | null> {
  const id = parseId(idParam);
  return getRawEventById(id);
}

async function replayRawEvent(idParam: string): Promise<RawEvent> {
  const id = parseId(idParam);
  return resetEventForReplay(id);
}

function parseId(idParam: string): bigint {
  try {
    return BigInt(idParam);
  } catch {
    throw new Error('Invalid raw event id');
  }
}

export { fetchRawEvent, replayRawEvent };

