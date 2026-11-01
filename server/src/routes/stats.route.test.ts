import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { getAllTimeStats } = vi.hoisted(() => ({
  getAllTimeStats: vi.fn(),
}));

vi.mock('../services/stats.service.js', () => ({
  getAllTimeStats,
}));

const { default: statsRoutes } = await import('./stats.route.js');

// Mounted like app.ts, without routers that need a database.
const app = express();
app.use(express.json());
app.use('/api', statsRoutes);

const TG_ID = '6000000000';

describe('GET /api/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when tgId is missing', async () => {
    const response = await request(app).get('/api/stats').expect(400);

    expect(response.body).toEqual({
      error: 'Query parameter "tgId" is required',
    });
    expect(getAllTimeStats).not.toHaveBeenCalled();
  });

  it('returns 400 when tgId is blank', async () => {
    await request(app).get('/api/stats').query({ tgId: '   ' }).expect(400);
    expect(getAllTimeStats).not.toHaveBeenCalled();
  });

  it('returns 400 when tgId is not a positive integer string', async () => {
    await request(app).get('/api/stats').query({ tgId: 'abc' }).expect(400);
    await request(app).get('/api/stats').query({ tgId: '0' }).expect(400);
    await request(app).get('/api/stats').query({ tgId: '-1' }).expect(400);
    expect(getAllTimeStats).not.toHaveBeenCalled();
  });

  it('returns 404 when player is unknown', async () => {
    getAllTimeStats.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/stats')
      .query({ tgId: TG_ID })
      .expect(404);

    expect(response.body).toEqual({ error: 'Player not found' });
  });

  it('returns 200 all-time stats for a known tgId', async () => {
    getAllTimeStats.mockResolvedValue({
      gameName: 'Me',
      tagLine: 'NA1',
      wins: 12,
      losses: 7,
    });

    const response = await request(app)
      .get('/api/stats')
      .query({ tgId: TG_ID })
      .expect(200);

    expect(response.body).toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      wins: 12,
      losses: 7,
    });
    expect(response.body).not.toHaveProperty('puuid');
    expect(getAllTimeStats).toHaveBeenCalledWith(BigInt(TG_ID));
  });

  it('returns 200 with zero W-L when service returns empty history', async () => {
    getAllTimeStats.mockResolvedValue({
      gameName: 'Me',
      tagLine: 'NA1',
      wins: 0,
      losses: 0,
    });

    const response = await request(app)
      .get('/api/stats')
      .query({ tgId: TG_ID })
      .expect(200);

    expect(response.body).toMatchObject({ wins: 0, losses: 0 });
  });

  it('does not expose legacy recent or details routes', async () => {
    await request(app).get('/api/stats/recent').query({ tgId: TG_ID }).expect(404);
    await request(app).get('/api/stats/details').query({ tgId: TG_ID }).expect(404);
  });
});
