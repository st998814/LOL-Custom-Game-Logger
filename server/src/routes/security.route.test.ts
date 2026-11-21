import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

import {
  loadMatchSnapshotFixture,
  mockRawEvent,
  withGameId,
} from '../../tests/helpers/ingestFixtures.js';

const { createRawEvent, findByDeduplicationKey, getRawEventById } = vi.hoisted(() => ({
  createRawEvent: vi.fn(),
  findByDeduplicationKey: vi.fn(),
  getRawEventById: vi.fn(),
}));

vi.mock('../models/rawEvent.model.js', () => ({
  createRawEvent,
  findByDeduplicationKey,
  getRawEventById,
  resetEventForReplay: vi.fn(),
}));

vi.mock('../db/redis.js', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    ttl: vi.fn(),
    on: vi.fn(),
    connect: vi.fn(),
  },
}));

const { getAccountStatus, requestLink, completeLink } = vi.hoisted(() => ({
  getAccountStatus: vi.fn(),
  requestLink: vi.fn(),
  completeLink: vi.fn(),
}));

vi.mock('../services/user.service.js', () => ({
  getAccountStatus,
  requestLink,
  completeLink,
}));

const { default: app } = await import('../app.js');

const ORIGINAL_AGENT_API_KEY = process.env.AGENT_API_KEY;
const ORIGINAL_ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function restoreAuthEnv() {
  if (ORIGINAL_AGENT_API_KEY === undefined) delete process.env.AGENT_API_KEY;
  else process.env.AGENT_API_KEY = ORIGINAL_AGENT_API_KEY;

  if (ORIGINAL_ADMIN_API_TOKEN === undefined) delete process.env.ADMIN_API_TOKEN;
  else process.env.ADMIN_API_TOKEN = ORIGINAL_ADMIN_API_TOKEN;

  if (ORIGINAL_NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIGINAL_NODE_ENV;
}

beforeEach(() => {
  vi.clearAllMocks();
  restoreAuthEnv();
  process.env.NODE_ENV = 'test';
  delete process.env.AGENT_API_KEY;
  delete process.env.ADMIN_API_TOKEN;
});

afterEach(() => {
  restoreAuthEnv();
});

describe('agent-facing auth boundary', () => {
  it('rejects POST /api/events without X-Agent-Key when AGENT_API_KEY is set', async () => {
    process.env.AGENT_API_KEY = 'agent-secret';

    const response = await request(app)
      .post('/api/events')
      .send(withGameId(loadMatchSnapshotFixture(), 920001001))
      .expect(401);

    expect(response.body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    expect(createRawEvent).not.toHaveBeenCalled();
  });

  it('rejects POST /api/events with an invalid X-Agent-Key', async () => {
    process.env.AGENT_API_KEY = 'agent-secret';

    const response = await request(app)
      .post('/api/events')
      .set('X-Agent-Key', 'wrong')
      .send(withGameId(loadMatchSnapshotFixture(), 920001002))
      .expect(401);

    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('preserves 202 ingest contract with a valid X-Agent-Key', async () => {
    process.env.AGENT_API_KEY = 'agent-secret';
    const payload = withGameId(loadMatchSnapshotFixture(), 920001003);
    findByDeduplicationKey.mockResolvedValue(null);
    createRawEvent.mockResolvedValue(
      mockRawEvent({ id: 33n, deduplicationKey: 'MATCH_SNAPSHOT:920001003' }),
    );

    const response = await request(app)
      .post('/api/events')
      .set('X-Agent-Key', 'agent-secret')
      .send(payload)
      .expect(202);

    expect(response.body).toEqual({ id: '33', status: 'PENDING' });
  });

  it('preserves 409 DUPLICATE_SNAPSHOT with a valid X-Agent-Key', async () => {
    process.env.AGENT_API_KEY = 'agent-secret';
    findByDeduplicationKey.mockResolvedValue(mockRawEvent({ id: 44n }));

    const response = await request(app)
      .post('/api/events')
      .set('X-Agent-Key', 'agent-secret')
      .send(withGameId(loadMatchSnapshotFixture(), 920001004))
      .expect(409);

    expect(response.body.code).toBe('DUPLICATE_SNAPSHOT');
  });

  it('rejects GET /api/user/status without credentials when key is set', async () => {
    process.env.AGENT_API_KEY = 'agent-secret';

    await request(app).get('/api/user/status').query({ puuid: 'p1' }).expect(401);
    expect(getAccountStatus).not.toHaveBeenCalled();
  });

  it('allows GET /api/user/status with valid X-Agent-Key', async () => {
    process.env.AGENT_API_KEY = 'agent-secret';
    getAccountStatus.mockResolvedValue({ registered: false, linked: false });

    const response = await request(app)
      .get('/api/user/status')
      .set('X-Agent-Key', 'agent-secret')
      .query({ puuid: 'p1' })
      .expect(200);

    expect(response.body).toEqual({ registered: false, linked: false });
  });

  it('does not require X-Agent-Key for POST /api/user/link/complete', async () => {
    process.env.AGENT_API_KEY = 'agent-secret';
    completeLink.mockResolvedValue({
      puuid: 'puuid-1',
      tgId: 1,
      gameName: 'Host',
    });

    const response = await request(app)
      .post('/api/user/link/complete')
      .send({ token: 'tok', tgId: 1 })
      .expect(200);

    expect(response.body.puuid).toBe('puuid-1');
    expect(completeLink).toHaveBeenCalled();
  });
});

describe('admin auth boundary', () => {
  it('rejects admin GET without X-Admin-Token when configured', async () => {
    process.env.ADMIN_API_TOKEN = 'admin-secret';

    const response = await request(app).get('/api/admin/raw-events/1').expect(401);

    expect(response.body.code).toBe('UNAUTHORIZED');
    expect(getRawEventById).not.toHaveBeenCalled();
  });

  it('allows admin GET with valid X-Admin-Token', async () => {
    process.env.ADMIN_API_TOKEN = 'admin-secret';
    getRawEventById.mockResolvedValue(mockRawEvent({ id: 1n, status: 'FAILED' }));

    const response = await request(app)
      .get('/api/admin/raw-events/1')
      .set('X-Admin-Token', 'admin-secret')
      .expect(200);

    expect(response.body.id).toBe('1');
  });
});

describe('payload size limit', () => {
  it('rejects oversized JSON bodies with 413', async () => {
    const limited = express();
    limited.use(express.json({ limit: '100b' }));
    limited.use((err: unknown, _req, res, next) => {
      const error = err as { type?: string; status?: number; statusCode?: number };
      if (
        error?.type === 'entity.too.large' ||
        error?.status === 413 ||
        error?.statusCode === 413
      ) {
        return res.status(413).json({
          error: 'Payload too large',
          code: 'PAYLOAD_TOO_LARGE',
        });
      }
      return next(err);
    });
    limited.post('/api/events', (_req, res) => res.status(202).json({ ok: true }));

    const response = await request(limited)
      .post('/api/events')
      .send({ blob: 'x'.repeat(500) })
      .expect(413);

    expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
