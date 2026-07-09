import type { RawEvent } from '../../generated/prisma/client.js';
import {
  DuplicateSnapshotError,
  IngestValidationError,
} from '../errors/ingest.errors.js';
import {
  createRawEvent,
  findByDeduplicationKey,
} from '../models/rawEvent.model.js';

type IngestRawEventResult = {
  event: RawEvent;
};

type IncomingPayload = {
  eventType?: string;
  deduplicationKey?: string;
  match?: Record<string, unknown>;
  players?: unknown;
  [key: string]: unknown;
};

function ensureObject(payload: unknown): IncomingPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new IngestValidationError(
      'Payload must be a JSON object',
      'INVALID_PAYLOAD',
    );
  }

  return payload as IncomingPayload;
}

function validateMatchSnapshot(body: IncomingPayload): void {
  if (body.eventType !== 'MATCH_SNAPSHOT') {
    throw new IngestValidationError(
      'eventType must be MATCH_SNAPSHOT',
      'INVALID_EVENT_TYPE',
    );
  }

  const match = body.match;
  if (!match || typeof match !== 'object' || Array.isArray(match)) {
    throw new IngestValidationError(
      'match must be an object',
      'INVALID_MATCH',
    );
  }

  if (typeof match.game_id !== 'number') {
    throw new IngestValidationError(
      'match.game_id is required and must be a number',
      'MISSING_GAME_ID',
    );
  }

  if (typeof match.game_duration !== 'number') {
    throw new IngestValidationError(
      'match.game_duration is required and must be a number',
      'MISSING_GAME_DURATION',
    );
  }

  if (
    typeof match.game_creation_date !== 'string' ||
    match.game_creation_date.length === 0
  ) {
    throw new IngestValidationError(
      'match.game_creation_date is required and must be a non-empty string',
      'MISSING_GAME_CREATION_DATE',
    );
  }

  if (!Array.isArray(body.players)) {
    throw new IngestValidationError(
      'players must be an array',
      'INVALID_PLAYERS',
    );
  }

  if (body.players.length !== 2) {
    throw new IngestValidationError(
      'players must contain exactly 2 entries for a 1v1 duel',
      'INVALID_PLAYERS_COUNT',
    );
  }
}

function deriveDeduplicationKey(body: IncomingPayload): string {
  if (
    typeof body.deduplicationKey === 'string' &&
    body.deduplicationKey.length > 0
  ) {
    return body.deduplicationKey;
  }

  const match = body.match as Record<string, unknown>;
  const gameId = match.game_id;

  if (typeof gameId === 'number') {
    return `MATCH_SNAPSHOT:${gameId}`;
  }

  throw new IngestValidationError(
    'match.game_id or deduplicationKey is required for ingest deduplication',
    'MISSING_GAME_ID',
  );
}

async function assertNotDuplicate(deduplicationKey: string): Promise<void> {
  const existing = await findByDeduplicationKey(deduplicationKey);

  if (existing) {
    throw new DuplicateSnapshotError(
      'A snapshot for this game has already been ingested',
      existing.id,
    );
  }
}

async function ingestRawEvent(rawBody: unknown): Promise<IngestRawEventResult> {
  const body = ensureObject(rawBody);
  validateMatchSnapshot(body);
  const deduplicationKey = deriveDeduplicationKey(body);

  await assertNotDuplicate(deduplicationKey);

  try {
    const event = await createRawEvent({
      eventType: 'MATCH_SNAPSHOT',
      payload: body as unknown as object,
      deduplicationKey,
    });

    return { event };
  } catch (error) {
    const prismaError = error as { code?: string };

    if (prismaError.code === 'P2002') {
      const existing = await findByDeduplicationKey(deduplicationKey);

      throw new DuplicateSnapshotError(
        'A snapshot for this game has already been ingested',
        existing?.id,
      );
    }

    throw error;
  }
}

export type { IngestRawEventResult };
export { ingestRawEvent };
