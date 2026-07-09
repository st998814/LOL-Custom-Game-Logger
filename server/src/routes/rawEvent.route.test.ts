import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import {
  loadMatchSnapshotFixture,
  mockRawEvent,
  withGameId,
} from '../../tests/helpers/ingestFixtures.js';

const { createRawEvent, findByDeduplicationKey } = vi.hoisted(() => ({
  createRawEvent: vi.fn(),
  findByDeduplicationKey: vi.fn(),
}));

vi.mock('../models/rawEvent.model.js', () => ({
  createRawEvent,
  findByDeduplicationKey,
}));

const { default: app } = await import('../app.js');

describe('POST /api/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 202 with id and PENDING for a valid snapshot', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 910001001);
    const created = mockRawEvent({
      id: 11n,
      deduplicationKey: 'MATCH_SNAPSHOT:910001001',
    });

    findByDeduplicationKey.mockResolvedValue(null);
    createRawEvent.mockResolvedValue(created);

    const response = await request(app)
      .post('/api/events')
      .send(payload)
      .expect(202);

    expect(response.body).toEqual({
      id: '11',
      status: 'PENDING',
    });
    expect(response.body).not.toHaveProperty('duplicate');
  });

  it('returns 409 DUPLICATE_SNAPSHOT when dedup key already exists', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 910001002);
    const existing = mockRawEvent({ id: 22n });

    findByDeduplicationKey.mockResolvedValue(existing);

    const response = await request(app)
      .post('/api/events')
      .send(payload)
      .expect(409);

    expect(response.body).toEqual({
      error: 'A snapshot for this game has already been ingested',
      code: 'DUPLICATE_SNAPSHOT',
      existingId: '22',
    });
    expect(createRawEvent).not.toHaveBeenCalled();
  });

  it('returns 400 with validation code for invalid payload', async () => {
    const response = await request(app)
      .post('/api/events')
      .send({})
      .expect(400);

    expect(response.body.code).toBe('INVALID_EVENT_TYPE');
    expect(response.body.error).toBeTruthy();
  });

  it('returns 400 INVALID_PLAYERS_COUNT when players length is not 2', async () => {
    const payload = loadMatchSnapshotFixture();
    const players = payload.players as unknown[];
    payload.players = [players[0], players[1], players[0]];

    const response = await request(app)
      .post('/api/events')
      .send(payload)
      .expect(400);

    expect(response.body.code).toBe('INVALID_PLAYERS_COUNT');
  });
});
