import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createIngestRateLimiter } from './agentRateLimit.js';

describe('createIngestRateLimiter', () => {
  it('returns 429 RATE_LIMITED after the configured max', async () => {
    const app = express();
    app.use(createIngestRateLimiter({ windowMs: 60_000, max: 1 }));
    app.post('/api/events', (_req, res) => res.status(202).json({ ok: true }));

    await request(app).post('/api/events').expect(202);

    const limited = await request(app).post('/api/events').expect(429);
    expect(limited.body).toEqual({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
    });
  });
});
