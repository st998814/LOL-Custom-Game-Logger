import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { pingPostgres, pingRedis } = vi.hoisted(() => ({
  pingPostgres: vi.fn(),
  pingRedis: vi.fn(),
}));

vi.mock('../db/prisma.js', () => ({
  default: {},
  pingPostgres,
  disconnectPrisma: vi.fn(),
}));

vi.mock('../db/redis.js', () => ({
  default: { isOpen: false, on: vi.fn(), connect: vi.fn() },
  pingRedis,
  disconnectRedis: vi.fn(),
}));

const { default: healthRoutes } = await import('./health.route.js');

const app = express();
app.use(healthRoutes);

describe('health routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /healthz is live without dependency checks', async () => {
    const response = await request(app).get('/healthz').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
    expect(pingPostgres).not.toHaveBeenCalled();
    expect(pingRedis).not.toHaveBeenCalled();
  });

  it('GET /readyz returns 200 when Postgres and Redis are up', async () => {
    pingPostgres.mockResolvedValue(true);
    pingRedis.mockResolvedValue(true);

    const response = await request(app).get('/readyz').expect(200);

    expect(response.body).toEqual({
      status: 'ready',
      postgres: true,
      redis: true,
    });
  });

  it('GET /readyz returns 503 when Postgres is down', async () => {
    pingPostgres.mockResolvedValue(false);
    pingRedis.mockResolvedValue(true);

    const response = await request(app).get('/readyz').expect(503);

    expect(response.body).toEqual({
      status: 'not_ready',
      postgres: false,
      redis: true,
    });
  });

  it('GET /readyz returns 503 when Redis is down', async () => {
    pingPostgres.mockResolvedValue(true);
    pingRedis.mockResolvedValue(false);

    const response = await request(app).get('/readyz').expect(503);

    expect(response.body.status).toBe('not_ready');
    expect(response.body.redis).toBe(false);
  });
});
