import type { RawEvent } from '../../generated/prisma/client.js';
import {
  createRawEvent,
  findByDeduplicationKey,
} from '../models/rawEvent.model.js';

type IngestRawEventResult = {
  event: RawEvent | null;
  duplicate: boolean;
};

type IncomingPayload = {
  eventType?: string;
  deduplicationKey?: string;
  match?: {
    game_id?: number;
    gameId?: number;
  };
  // Allow arbitrary other fields from the client
  [key: string]: unknown;
};

function ensureObject(payload: unknown): IncomingPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a JSON object');
  }

  return payload as IncomingPayload;
}

function deriveEventType(body: IncomingPayload): string {
  if (typeof body.eventType === 'string' && body.eventType.length > 0) {
    return body.eventType;
  }

  // Default for current client payloads (match + players snapshot)
  return 'MATCH_SNAPSHOT';
}

function deriveDeduplicationKey(
  body: IncomingPayload,
  eventType: string,
): string | null {
  if (
    typeof body.deduplicationKey === 'string' &&
    body.deduplicationKey.length > 0
  ) {
    return body.deduplicationKey;
  }

  const match = body.match ?? {};
  const gameId =
    typeof match.game_id === 'number'
      ? match.game_id
      : typeof match.gameId === 'number'
        ? match.gameId
        : null;

  if (gameId !== null) {
    return `${eventType}:${gameId}`;
  }

  return null;
}

async function ingestRawEvent(rawBody: unknown): Promise<IngestRawEventResult> {
  const body = ensureObject(rawBody);
  const eventType = deriveEventType(body);
  const deduplicationKey = deriveDeduplicationKey(body, eventType);

  try {
    const event = await createRawEvent({
      eventType,
      // Store entire client payload as raw JSON
      payload: body as unknown as object,
      deduplicationKey,
    });

    return {
      event,
      duplicate: false,
    };
  } catch (error) {
    const anyError = error as { code?: string };

    // Unique constraint on deduplicationKey
    if (anyError.code === 'P2002' && deduplicationKey) {
      const existing = await findByDeduplicationKey(deduplicationKey);

      return {
        event: existing,
        duplicate: true,
      };
    }

    throw error;
  }
}

export type { IngestRawEventResult };
export { ingestRawEvent };

