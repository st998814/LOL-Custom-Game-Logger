import prisma from '../db/prisma.js';
import type { Prisma, RawEvent, RawEventStatus } from '../../generated/prisma/client.js';

type CreateRawEventParams = {
  eventType: string;
  payload: Prisma.InputJsonValue;
  deduplicationKey?: string | null;
};

async function createRawEvent(params: CreateRawEventParams): Promise<RawEvent> {
  const { eventType, payload, deduplicationKey } = params;

  return prisma.rawEvent.create({
    data: {
      eventType,
      payload,
      deduplicationKey: deduplicationKey ?? null,
    },
  });
}

async function findByDeduplicationKey(
  deduplicationKey: string,
): Promise<RawEvent | null> {
  return prisma.rawEvent.findUnique({
    where: { deduplicationKey },
  });
}

/** Default lease for PROCESSING; safely above normal MATCH_SNAPSHOT persist time. */
const STALE_PROCESSING_MS = 10 * 60 * 1000;

const STALE_PROCESSING_MESSAGE =
  'Reclaimed stale PROCESSING after worker interruption';

async function getPendingEventsBatch(limit: number): Promise<RawEvent[]> {
  return prisma.rawEvent.findMany({
    where: { status: 'PENDING' as RawEventStatus },
    orderBy: { receivedAt: 'asc' },
    take: limit,
  });
}

/**
 * Return stuck PROCESSING rows to PENDING so a restarted worker can continue.
 * Uses processedAt as the processing-lease timestamp set by markEventsProcessing
 * (no schema migration). Null processedAt covers legacy stuck rows.
 */
async function reclaimStaleProcessingEvents(
  olderThanMs: number = STALE_PROCESSING_MS,
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);

  const result = await prisma.rawEvent.updateMany({
    where: {
      status: 'PROCESSING' as RawEventStatus,
      OR: [{ processedAt: null }, { processedAt: { lt: cutoff } }],
    },
    data: {
      status: 'PENDING' as RawEventStatus,
      processedAt: null,
      errorMessage: STALE_PROCESSING_MESSAGE,
    },
  });

  return result.count;
}

async function markEventsProcessing(ids: bigint[]): Promise<void> {
  if (!ids.length) return;

  await prisma.rawEvent.updateMany({
    where: { id: { in: ids } },
    data: {
      status: 'PROCESSING' as RawEventStatus,
      retryCount: { increment: 1 },
      // Lease start for stale reclaim (repurposed while status is PROCESSING).
      processedAt: new Date(),
      errorMessage: null,
    },
  });
}

async function markEventProcessed(id: bigint): Promise<void> {
  await prisma.rawEvent.update({
    where: { id },
    data: {
      status: 'PROCESSED' as RawEventStatus,
      processedAt: new Date(),
      errorMessage: null,
    },
  });
}

async function markEventFailed(id: bigint, errorMessage: string): Promise<void> {
  await prisma.rawEvent.update({
    where: { id },
    data: {
      status: 'FAILED' as RawEventStatus,
      processedAt: new Date(),
      errorMessage: errorMessage.slice(0, 500),
    },
  });
}

async function markEventPendingForRetry(
  id: bigint,
  errorMessage: string,
): Promise<void> {
  await prisma.rawEvent.update({
    where: { id },
    data: {
      status: 'PENDING' as RawEventStatus,
      errorMessage: errorMessage.slice(0, 500),
    },
  });
}

async function getRawEventById(id: bigint): Promise<RawEvent | null> {
  return prisma.rawEvent.findUnique({
    where: { id },
  });
}

async function resetEventForReplay(id: bigint): Promise<RawEvent> {
  return prisma.rawEvent.update({
    where: { id },
    data: {
      status: 'PENDING' as RawEventStatus,
      retryCount: 0,
      processedAt: null,
      errorMessage: null,
    },
  });
}

export {
  STALE_PROCESSING_MESSAGE,
  STALE_PROCESSING_MS,
  createRawEvent,
  findByDeduplicationKey,
  getPendingEventsBatch,
  reclaimStaleProcessingEvents,
  markEventsProcessing,
  markEventProcessed,
  markEventFailed,
  markEventPendingForRetry,
  getRawEventById,
  resetEventForReplay,
};



