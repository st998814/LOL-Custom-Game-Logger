import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DuplicateSnapshotError, IngestValidationError } from '../errors/ingest.errors.js';
import { createRawEvent, findByDeduplicationKey } from '../models/rawEvent.model.js';
import { ingestRawEvent } from './rawEvent.service.js';
import {
  loadMatchSnapshotFixture,
  mockRawEvent,
  withGameId,
} from '../../tests/helpers/ingestFixtures.js';

vi.mock('../models/rawEvent.model.js', () => ({
  createRawEvent: vi.fn(),
  findByDeduplicationKey: vi.fn(),
}));

const mockedCreateRawEvent = vi.mocked(createRawEvent);
const mockedFindByDeduplicationKey = vi.mocked(findByDeduplicationKey);

describe('ingestRawEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues a valid MATCH_SNAPSHOT and derives deduplication key from game_id', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900001001);
    const created = mockRawEvent({
      id: 7n,
      deduplicationKey: 'MATCH_SNAPSHOT:900001001',
    });

    mockedFindByDeduplicationKey.mockResolvedValue(null);
    mockedCreateRawEvent.mockResolvedValue(created);

    const result = await ingestRawEvent(payload);

    expect(mockedFindByDeduplicationKey).toHaveBeenCalledWith(
      'MATCH_SNAPSHOT:900001001',
    );
    expect(mockedCreateRawEvent).toHaveBeenCalledWith({
      eventType: 'MATCH_SNAPSHOT',
      payload,
      deduplicationKey: 'MATCH_SNAPSHOT:900001001',
    });
    expect(result.event).toBe(created);
  });

  it('checks deduplication before insert', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900001002);

    mockedFindByDeduplicationKey.mockResolvedValue(null);
    mockedCreateRawEvent.mockResolvedValue(mockRawEvent());

    await ingestRawEvent(payload);

    expect(mockedFindByDeduplicationKey).toHaveBeenCalledBefore(
      mockedCreateRawEvent,
    );
  });

  it('rejects duplicate snapshots via front guard', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900001003);
    const existing = mockRawEvent({ id: 99n });

    mockedFindByDeduplicationKey.mockResolvedValue(existing);

    await expect(ingestRawEvent(payload)).rejects.toMatchObject({
      name: 'DuplicateSnapshotError',
      code: 'DUPLICATE_SNAPSHOT',
      existingId: 99n,
    });
    expect(mockedCreateRawEvent).not.toHaveBeenCalled();
  });

  it('maps P2002 insert races to DuplicateSnapshotError', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900001004);
    const existing = mockRawEvent({ id: 100n });

    mockedFindByDeduplicationKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    mockedCreateRawEvent.mockRejectedValue({ code: 'P2002' });

    await expect(ingestRawEvent(payload)).rejects.toBeInstanceOf(
      DuplicateSnapshotError,
    );
  });

  it('rejects non-object payloads', async () => {
    await expect(ingestRawEvent(null)).rejects.toMatchObject({
      name: 'IngestValidationError',
      code: 'INVALID_PAYLOAD',
    });
  });

  it('rejects wrong eventType', async () => {
    const payload = {
      ...loadMatchSnapshotFixture(),
      eventType: 'OTHER',
    };

    await expect(ingestRawEvent(payload)).rejects.toMatchObject({
      name: 'IngestValidationError',
      code: 'INVALID_EVENT_TYPE',
    });
  });

  it('rejects when players length is not 2', async () => {
    const payload = loadMatchSnapshotFixture();
    const players = payload.players as unknown[];
    payload.players = [players[0]];

    await expect(ingestRawEvent(payload)).rejects.toMatchObject({
      name: 'IngestValidationError',
      code: 'INVALID_PLAYERS_COUNT',
    });
  });

  it('rejects missing match.game_id', async () => {
    const payload = loadMatchSnapshotFixture();
    const match = { ...(payload.match as Record<string, unknown>) };
    delete match.game_id;
    payload.match = match;

    await expect(ingestRawEvent(payload)).rejects.toMatchObject({
      name: 'IngestValidationError',
      code: 'MISSING_GAME_ID',
    });
  });

  it('uses explicit deduplicationKey when provided', async () => {
    const payload = {
      ...withGameId(loadMatchSnapshotFixture(), 900001005),
      deduplicationKey: 'custom-key',
    };

    mockedFindByDeduplicationKey.mockResolvedValue(null);
    mockedCreateRawEvent.mockResolvedValue(mockRawEvent());

    await ingestRawEvent(payload);

    expect(mockedFindByDeduplicationKey).toHaveBeenCalledWith('custom-key');
    expect(mockedCreateRawEvent).toHaveBeenCalledWith(
      expect.objectContaining({ deduplicationKey: 'custom-key' }),
    );
  });
});

describe('ingest validation error types', () => {
  it('exposes stable error codes for controller mapping', () => {
    const validation = new IngestValidationError('bad', 'MISSING_GAME_ID');
    const duplicate = new DuplicateSnapshotError('dup', 1n);

    expect(validation.code).toBe('MISSING_GAME_ID');
    expect(duplicate.code).toBe('DUPLICATE_SNAPSHOT');
  });
});
