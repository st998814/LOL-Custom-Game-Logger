import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { getAllTimeStats, getRecentStats, getDetailedStats } = vi.hoisted(() => ({
  getAllTimeStats: vi.fn(),
  getRecentStats: vi.fn(),
  getDetailedStats: vi.fn(),
}));

vi.mock('../services/stats.service.js', () => ({
  getAllTimeStats,
  getRecentStats,
  getDetailedStats,
}));

const { default: app } = await import('../app.js');

describe('GET /api/stats*', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when puuid is missing on /api/stats', async () => {
    const response = await request(app).get('/api/stats').expect(400);

    expect(response.body).toEqual({
      error: 'Query parameter "puuid" is required',
    });
    expect(getAllTimeStats).not.toHaveBeenCalled();
  });

  it('returns 400 when puuid is blank', async () => {
    await request(app).get('/api/stats').query({ puuid: '   ' }).expect(400);
    expect(getAllTimeStats).not.toHaveBeenCalled();
  });

  it('returns 404 when player is unknown', async () => {
    getAllTimeStats.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/stats')
      .query({ puuid: 'missing-puuid' })
      .expect(404);

    expect(response.body).toEqual({ error: 'Player not found' });
  });

  it('returns 200 all-time stats for a known puuid', async () => {
    getAllTimeStats.mockResolvedValue({
      puuid: 'puuid-me',
      gameName: 'Me',
      tagLine: 'NA1',
      wins: 12,
      losses: 7,
    });

    const response = await request(app)
      .get('/api/stats')
      .query({ puuid: 'puuid-me' })
      .expect(200);

    expect(response.body).toEqual({
      puuid: 'puuid-me',
      gameName: 'Me',
      tagLine: 'NA1',
      wins: 12,
      losses: 7,
    });
    expect(getAllTimeStats).toHaveBeenCalledWith('puuid-me');
  });

  it('returns 200 recent matches for /api/stats/recent', async () => {
    getRecentStats.mockResolvedValue({
      puuid: 'puuid-me',
      gameName: 'Me',
      tagLine: 'NA1',
      matches: [
        {
          gameId: 1,
          gameCreationDate: '2026-03-16T00:00:00.000Z',
          won: true,
          opponent: { gameName: 'Rival', tagLine: 'NA1' },
          myChampionId: 54,
          opponentChampionId: 99,
          winReason: 'firstBlood',
        },
      ],
    });

    const response = await request(app)
      .get('/api/stats/recent')
      .query({ puuid: 'puuid-me' })
      .expect(200);

    expect(response.body.matches).toHaveLength(1);
    expect(getRecentStats).toHaveBeenCalledWith('puuid-me');
  });

  it('returns 200 details for /api/stats/details', async () => {
    getDetailedStats.mockResolvedValue({
      puuid: 'puuid-me',
      gameName: 'Me',
      tagLine: 'NA1',
      byOpponent: [
        {
          opponent: { gameName: 'Rival', tagLine: 'NA1' },
          wins: 2,
          losses: 1,
        },
      ],
      matches: [],
    });

    const response = await request(app)
      .get('/api/stats/details')
      .query({ puuid: 'puuid-me' })
      .expect(200);

    expect(response.body.byOpponent).toHaveLength(1);
    expect(getDetailedStats).toHaveBeenCalledWith('puuid-me');
  });

  it('returns 200 with empty aggregates when service returns zero matches', async () => {
    getAllTimeStats.mockResolvedValue({
      puuid: 'puuid-me',
      gameName: 'Me',
      tagLine: 'NA1',
      wins: 0,
      losses: 0,
    });

    const response = await request(app)
      .get('/api/stats')
      .query({ puuid: 'puuid-me' })
      .expect(200);

    expect(response.body).toMatchObject({ wins: 0, losses: 0 });
  });
});
