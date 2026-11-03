import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  getAllTimeStats,
  getAverageStats,
  getTopmostStats,
  getChampionStats,
  getDateStats,
  parseStatsDate,
} = vi.hoisted(() => {
  function parseStatsDate(date: string): {
    start: Date;
    end: Date;
    normalized: string;
  } | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(date.trim());
    if (!match) return null;
    const yy = Number(match[1]);
    const mm = Number(match[2]);
    const dd = Number(match[3]);
    const year = 2000 + yy;
    const start = new Date(Date.UTC(year, mm - 1, dd));
    if (
      start.getUTCFullYear() !== year ||
      start.getUTCMonth() !== mm - 1 ||
      start.getUTCDate() !== dd
    ) {
      return null;
    }
    return {
      start,
      end: new Date(Date.UTC(year, mm - 1, dd + 1)),
      normalized: `${String(yy).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}`,
    };
  }

  return {
    getAllTimeStats: vi.fn(),
    getAverageStats: vi.fn(),
    getTopmostStats: vi.fn(),
    getChampionStats: vi.fn(),
    getDateStats: vi.fn(),
    parseStatsDate,
  };
});

vi.mock('../services/stats.service.js', () => ({
  getAllTimeStats,
  getAverageStats,
  getTopmostStats,
  getChampionStats,
  getDateStats,
  parseStatsDate,
}));

const { default: statsRoutes } = await import('./stats.route.js');

const app = express();
app.use(express.json());
app.use('/api', statsRoutes);

const TG_ID = '6000000000';
const identity = { gameName: 'Me', tagLine: 'NA1' };

describe('GET /api/stats*', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when tgId is missing on /api/stats', async () => {
    const response = await request(app).get('/api/stats').expect(400);

    expect(response.body).toEqual({
      error: 'Query parameter "tgId" is required',
    });
    expect(getAllTimeStats).not.toHaveBeenCalled();
  });

  it('returns 400 when tgId is blank or not a positive integer', async () => {
    await request(app).get('/api/stats').query({ tgId: '   ' }).expect(400);
    await request(app).get('/api/stats').query({ tgId: 'abc' }).expect(400);
    await request(app).get('/api/stats').query({ tgId: '0' }).expect(400);
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
      ...identity,
      wins: 12,
      losses: 7,
    });

    const response = await request(app)
      .get('/api/stats')
      .query({ tgId: TG_ID })
      .expect(200);

    expect(response.body).toEqual({
      ...identity,
      wins: 12,
      losses: 7,
    });
    expect(response.body).not.toHaveProperty('puuid');
    expect(getAllTimeStats).toHaveBeenCalledWith(BigInt(TG_ID));
  });

  it('returns 200 average stats', async () => {
    getAverageStats.mockResolvedValue({
      ...identity,
      winRate: 55.5,
      avgDurationSec: 1285,
      avgFirstBloodRate: 30,
      avgFirstTowerRate: 20,
      avgCs: 58.2,
    });

    const response = await request(app)
      .get('/api/stats/average')
      .query({ tgId: TG_ID })
      .expect(200);

    expect(response.body).toMatchObject({
      winRate: 55.5,
      avgDurationSec: 1285,
      avgCs: 58.2,
    });
    expect(getAverageStats).toHaveBeenCalledWith(BigInt(TG_ID));
  });

  it('returns 200 topmost stats including null leaders', async () => {
    getTopmostStats.mockResolvedValue({
      ...identity,
      mostSelectedChampionId: null,
      mostCommonWinReason: null,
    });

    const response = await request(app)
      .get('/api/stats/topmost')
      .query({ tgId: TG_ID })
      .expect(200);

    expect(response.body).toEqual({
      ...identity,
      mostSelectedChampionId: null,
      mostCommonWinReason: null,
    });
    expect(getTopmostStats).toHaveBeenCalledWith(BigInt(TG_ID));
  });

  it('returns 400 when championId is missing or invalid', async () => {
    await request(app)
      .get('/api/stats/champion')
      .query({ tgId: TG_ID })
      .expect(400);
    await request(app)
      .get('/api/stats/champion')
      .query({ tgId: TG_ID, championId: 'Garen' })
      .expect(400);
    await request(app)
      .get('/api/stats/champion')
      .query({ tgId: TG_ID, championId: '0' })
      .expect(400);
    expect(getChampionStats).not.toHaveBeenCalled();
  });

  it('returns 200 champion stats for a known championId', async () => {
    getChampionStats.mockResolvedValue({
      ...identity,
      championId: 54,
      games: 2,
      wins: 1,
      losses: 1,
      winReasons: { firstBlood: 1, firstTower: 0, cs: 1 },
    });

    const response = await request(app)
      .get('/api/stats/champion')
      .query({ tgId: TG_ID, championId: '54' })
      .expect(200);

    expect(response.body.championId).toBe(54);
    expect(getChampionStats).toHaveBeenCalledWith(BigInt(TG_ID), 54);
  });

  it('returns 400 when date is missing or invalid', async () => {
    await request(app).get('/api/stats/date').query({ tgId: TG_ID }).expect(400);
    await request(app)
      .get('/api/stats/date')
      .query({ tgId: TG_ID, date: '2026-03-16' })
      .expect(400);
    await request(app)
      .get('/api/stats/date')
      .query({ tgId: TG_ID, date: '26/13/01' })
      .expect(400);
    expect(getDateStats).not.toHaveBeenCalled();
  });

  it('returns 200 date stats for a valid yy/mm/dd', async () => {
    getDateStats.mockResolvedValue({
      ...identity,
      date: '26/03/16',
      games: 2,
      wins: 1,
      losses: 1,
    });

    const response = await request(app)
      .get('/api/stats/date')
      .query({ tgId: TG_ID, date: '26/03/16' })
      .expect(200);

    expect(response.body).toMatchObject({ date: '26/03/16', games: 2 });
    expect(getDateStats).toHaveBeenCalledWith(BigInt(TG_ID), '26/03/16');
  });

  it('does not expose legacy recent or details routes', async () => {
    await request(app).get('/api/stats/recent').query({ tgId: TG_ID }).expect(404);
    await request(app).get('/api/stats/details').query({ tgId: TG_ID }).expect(404);
  });
});
