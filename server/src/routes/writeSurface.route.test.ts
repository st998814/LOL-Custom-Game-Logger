import { describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../app.js';

/**
 * REQ-TRU-01: ledger writes must not expose a direct create-match HTTP path.
 * Legacy POST /api/data was removed; this guards against reintroduction.
 */
describe('ledger write surface', () => {
  it('returns 404 for POST /api/data (no direct match create)', async () => {
    const response = await request(app)
      .post('/api/data')
      .send({
        gameId: 1,
        gameDuration: 100,
        gameCreationDate: '2026-01-01T00:00:00.000Z',
      });

    expect(response.status).toBe(404);
  });
});
