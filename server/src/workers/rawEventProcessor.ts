import type { RawEvent } from '../../generated/prisma/client.js';
import {
  getPendingEventsBatch,
  markEventsProcessing,
  markEventProcessed,
  markEventFailed,
  markEventPendingForRetry,
} from '../models/rawEvent.model.js';
import { persistMatchSnapshot } from '../services/matchSnapshot.service.js';

const BATCH_SIZE = 20;
const POLL_INTERVAL_MS = 2_000;
const MAX_RETRIES = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processSingleEvent(event: RawEvent): Promise<void> {
  if (event.eventType === 'MATCH_SNAPSHOT') {
    await persistMatchSnapshot(event.payload);
    return;
  }

  throw new Error(`Unsupported eventType: ${event.eventType}`);
}

async function processBatch(): Promise<void> {
  const events = await getPendingEventsBatch(BATCH_SIZE);
  if (events.length === 0) {
    return;
  }

  const ids = events.map((event) => event.id);

  await markEventsProcessing(ids);

  for (const event of events) {
    try {
      await processSingleEvent(event);
      await markEventProcessed(event.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown processing error';

      const attemptCount = (event.retryCount ?? 0) + 1;
      const hasMoreRetries = attemptCount < MAX_RETRIES;

      if (hasMoreRetries) {
        await markEventPendingForRetry(event.id, message);
      } else {
        await markEventFailed(event.id, message);
      }
    }
  }
}

async function startRawEventProcessorLoop(): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processBatch();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('RawEventProcessor batch failed', error);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

export {
  BATCH_SIZE,
  MAX_RETRIES,
  POLL_INTERVAL_MS,
  processBatch,
  processSingleEvent,
  startRawEventProcessorLoop,
};
