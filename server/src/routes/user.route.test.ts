import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { getAccountStatus, requestLink, completeLink } = vi.hoisted(() => ({
  getAccountStatus: vi.fn(),
  requestLink: vi.fn(),
  completeLink: vi.fn(),
}));

vi.mock('../services/user.service.js', () => ({ getAccountStatus, requestLink, completeLink }));

const { default: userRoutes } = await import('./user.routes.js');
const {
  AlreadyLinkedError,
  LinkExpiredError,
  NotRegisteredError,
  TgAlreadyLinkedError,
} = await import('../errors/user.errors.js');

// Mounted like app.ts, without the routers that need a database.
const app = express();
app.use(express.json());
app.use('/api/user', userRoutes);

const TICKET = { status: 'pending', link: 'https://t.me/bot?start=abc', expiresIn: 600 };
const LINKED = { puuid: 'puuid-1', tgId: 6_000_000_000, gameName: 'Host' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/user/status', () => {
  it('returns the account status for a trimmed puuid', async () => {
    getAccountStatus.mockResolvedValue({ registered: true, linked: false });

    const response = await request(app)
      .get('/api/user/status')
      .query({ puuid: '  puuid-1  ' })
      .expect(200);

    expect(response.body).toEqual({ registered: true, linked: false });
    expect(getAccountStatus).toHaveBeenCalledWith('puuid-1');
  });

  it.each([undefined, '   '])('returns 400 INVALID_INPUT for puuid %o', async (puuid) => {
    const response = await request(app)
      .get('/api/user/status')
      .query(puuid === undefined ? {} : { puuid })
      .expect(400);

    expect(response.body.code).toBe('INVALID_INPUT');
    expect(getAccountStatus).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL on unexpected errors', async () => {
    getAccountStatus.mockRejectedValue(new Error('db down'));

    const response = await request(app).get('/api/user/status').query({ puuid: 'p' }).expect(500);

    expect(response.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
  });
});

describe.each(['/api/user/link', '/api/user/register/link'])('POST %s', (path) => {
  it('returns the link ticket', async () => {
    requestLink.mockResolvedValue(TICKET);

    const response = await request(app).post(path).send({ puuid: 'puuid-1' }).expect(200);

    expect(response.body).toEqual(TICKET);
    expect(requestLink).toHaveBeenCalledWith('puuid-1');
  });

  it('returns 409 ALREADY_LINKED', async () => {
    requestLink.mockRejectedValue(new AlreadyLinkedError());

    const response = await request(app).post(path).send({ puuid: 'puuid-1' }).expect(409);

    expect(response.body.code).toBe('ALREADY_LINKED');
  });

  it.each([{}, { puuid: '' }, { puuid: 42 }])('returns 400 INVALID_INPUT for body %o', async (body) => {
    const response = await request(app).post(path).send(body).expect(400);

    expect(response.body.code).toBe('INVALID_INPUT');
    expect(requestLink).not.toHaveBeenCalled();
  });

  it('returns 400 INVALID_INPUT when there is no body', async () => {
    const response = await request(app).post(path).expect(400);

    expect(response.body.code).toBe('INVALID_INPUT');
  });
});

describe.each(['/api/user/link/complete', '/api/user/register/link/complete'])('POST %s', (path) => {
  it('returns the linked player with tgId as a number', async () => {
    completeLink.mockResolvedValue(LINKED);

    const response = await request(app)
      .post(path)
      .send({ token: 'abc', tgId: 6_000_000_000 })
      .expect(200);

    expect(response.body).toEqual(LINKED);
    expect(completeLink).toHaveBeenCalledWith('abc', 6_000_000_000);
  });

  it.each([
    [new NotRegisteredError(), 404, 'NOT_REGISTERED'],
    [new LinkExpiredError(), 410, 'LINK_EXPIRED'],
    [new AlreadyLinkedError(), 409, 'ALREADY_LINKED'],
    [new TgAlreadyLinkedError(), 409, 'TG_ALREADY_LINKED'],
  ])('maps %s to %i %s', async (error, status, code) => {
    completeLink.mockRejectedValue(error);

    const response = await request(app).post(path).send({ token: 'abc', tgId: 1 }).expect(status);

    expect(response.body).toEqual({ error: error.message, code });
  });

  it.each([
    { tgId: 1 },
    { token: '', tgId: 1 },
    { token: 'abc' },
    { token: 'abc', tgId: '1' },
    { token: 'abc', tgId: 0 },
    { token: 'abc', tgId: 1.5 },
  ])('returns 400 INVALID_INPUT for body %o', async (body) => {
    const response = await request(app).post(path).send(body).expect(400);

    expect(response.body.code).toBe('INVALID_INPUT');
    expect(completeLink).not.toHaveBeenCalled();
  });
});
