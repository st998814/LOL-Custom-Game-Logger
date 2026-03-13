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

async function getPendingEventsBatch(limit: number): Promise<RawEvent[]> {
  return prisma.rawEvent.findMany({
    where: { status: 'PENDING' as RawEventStatus },
    orderBy: { receivedAt: 'asc' },
    take: limit,
  });
}

async function markEventsProcessing(ids: bigint[]): Promise<void> {
  if (!ids.length) return;

  await prisma.rawEvent.updateMany({
    where: { id: { in: ids } },
    data: {
      status: 'PROCESSING' as RawEventStatus,
      retryCount: { increment: 1 },
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
  createRawEvent,
  findByDeduplicationKey,
  getPendingEventsBatch,
  markEventsProcessing,
  markEventProcessed,
  markEventFailed,
  markEventPendingForRetry,
  getRawEventById,
  resetEventForReplay,
};



