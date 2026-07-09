import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { RawEvent } from '../../generated/prisma/client.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');

function loadMatchSnapshotFixture(): Record<string, unknown> {
  const raw = readFileSync(join(fixtureDir, 'match-snapshot.json'), 'utf8');
  return JSON.parse(raw) as Record<string, unknown>;
}

function withGameId(
  payload: Record<string, unknown>,
  gameId: number,
): Record<string, unknown> {
  const match = payload.match as Record<string, unknown>;
  return {
    ...payload,
    match: {
      ...match,
      game_id: gameId,
    },
  };
}

function mockRawEvent(overrides: Partial<RawEvent> = {}): RawEvent {
  return {
    id: 42n,
    eventType: 'MATCH_SNAPSHOT',
    payload: {},
    status: 'PENDING',
    receivedAt: new Date('2026-03-16T12:32:09.240Z'),
    processedAt: null,
    retryCount: 0,
    errorMessage: null,
    deduplicationKey: 'MATCH_SNAPSHOT:695827639',
    ...overrides,
  } as RawEvent;
}

export { loadMatchSnapshotFixture, mockRawEvent, withGameId };
