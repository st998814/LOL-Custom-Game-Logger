import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findPlayerLinkState, setTgIdByPuuid, store } = vi.hoisted(() => ({
  findPlayerLinkState: vi.fn(),
  setTgIdByPuuid: vi.fn(),
  store: new Map<string, { value: string; ttl: number }>(),
}));

vi.mock('../models/user.model.js', () => ({ findPlayerLinkState, setTgIdByPuuid }));

// In-memory stand-in for the node-redis commands the service uses.
vi.mock('../db/redis.js', () => ({
  default: {
    get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
    ttl: vi.fn(async (key: string) => store.get(key)?.ttl ?? -2),
    set: vi.fn(
      async (
        key: string,
        value: string,
        options?: { expiration?: { value: number }; condition?: 'NX' },
      ) => {
        if (options?.condition === 'NX' && store.has(key)) return null;
        store.set(key, { value, ttl: options?.expiration?.value ?? -1 });
        return 'OK';
      },
    ),
    del: vi.fn(async (keys: string | string[]) => {
      let removed = 0;
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        if (store.delete(key)) removed += 1;
      }
      return removed;
    }),
  },
}));

const { default: redisClient } = await import('../db/redis.js');
const { completeLink, getAccountStatus, LINK_TTL_SECONDS, requestLink } = await import(
  './user.service.js'
);
const {
  AlreadyLinkedError,
  LinkExpiredError,
  NotRegisteredError,
  TgAlreadyLinkedError,
} = await import('../errors/user.errors.js');

const PUUID = 'puuid-1';
const TG_ID = 6_000_000_000; // larger than 2^31

function tokenFromLink(link: string): string {
  return new URL(link).searchParams.get('start') ?? '';
}

function prismaError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  delete process.env.TELEGRAM_BOT_USERNAME;
});

describe('getAccountStatus', () => {
  it.each([
    [null, { registered: false, linked: false }],
    [{ tgId: null }, { registered: true, linked: false }],
    [{ tgId: 42n }, { registered: true, linked: true }],
  ])('maps link state %o to %o', async (state, expected) => {
    findPlayerLinkState.mockResolvedValue(state);

    await expect(getAccountStatus(PUUID)).resolves.toEqual(expected);
    expect(findPlayerLinkState).toHaveBeenCalledWith(PUUID);
  });
});

describe('requestLink', () => {
  it('issues a new link with expiresIn and stores both keys', async () => {
    findPlayerLinkState.mockResolvedValue({ tgId: null });

    const ticket = await requestLink(PUUID);

    expect(ticket.status).toBe('pending');
    expect(ticket.expiresIn).toBe(LINK_TTL_SECONDS);
    expect(ticket.link).toMatch(/^https:\/\/t\.me\/Dev962299Bot\?start=[0-9a-f]{64}$/);
    const token = tokenFromLink(ticket.link);
    expect(store.get(`telegram_link:${token}`)?.value).toBe(PUUID);
    expect(store.get(`telegram_link:puuid:${PUUID}`)?.value).toBe(token);
  });

  it('allows an unregistered PUUID', async () => {
    findPlayerLinkState.mockResolvedValue(null);

    await expect(requestLink(PUUID)).resolves.toMatchObject({ status: 'pending' });
  });

  it('reuses a still-valid link and reports its remaining TTL', async () => {
    findPlayerLinkState.mockResolvedValue({ tgId: null });
    const first = await requestLink(PUUID);
    store.get(`telegram_link:${tokenFromLink(first.link)}`)!.ttl = 120;

    const second = await requestLink(PUUID);

    expect(second.link).toBe(first.link);
    expect(second.expiresIn).toBe(120);
  });

  it('replaces a stale reverse key whose token has expired', async () => {
    findPlayerLinkState.mockResolvedValue({ tgId: null });
    store.set(`telegram_link:puuid:${PUUID}`, { value: 'gone', ttl: 300 });

    const ticket = await requestLink(PUUID);

    expect(tokenFromLink(ticket.link)).not.toBe('gone');
    expect(store.get(`telegram_link:puuid:${PUUID}`)?.value).toBe(tokenFromLink(ticket.link));
  });

  it('returns the winning token when a concurrent request claims the PUUID first', async () => {
    findPlayerLinkState.mockResolvedValue({ tgId: null });
    store.set('telegram_link:winner', { value: PUUID, ttl: 600 });
    vi.mocked(redisClient.set).mockImplementationOnce(async (key, value, options) => {
      // Our token key is written, then the winner claims the reverse key.
      store.set(key as string, { value: value as string, ttl: options?.expiration ? 600 : -1 });
      store.set(`telegram_link:puuid:${PUUID}`, { value: 'winner', ttl: 600 });
      return 'OK';
    });

    const ticket = await requestLink(PUUID);

    expect(tokenFromLink(ticket.link)).toBe('winner');
    const ownTokens = [...store.keys()].filter(
      (key) => key.startsWith('telegram_link:') && !key.includes('puuid:') && key !== 'telegram_link:winner',
    );
    expect(ownTokens).toEqual([]);
  });

  it('rejects a PUUID that is already linked', async () => {
    findPlayerLinkState.mockResolvedValue({ tgId: 42n });

    await expect(requestLink(PUUID)).rejects.toBeInstanceOf(AlreadyLinkedError);
    expect(store.size).toBe(0);
  });

  it('uses TELEGRAM_BOT_USERNAME when set', async () => {
    process.env.TELEGRAM_BOT_USERNAME = 'LedgerBot';
    findPlayerLinkState.mockResolvedValue({ tgId: null });

    const ticket = await requestLink(PUUID);

    expect(ticket.link.startsWith('https://t.me/LedgerBot?start=')).toBe(true);
  });
});

describe('completeLink', () => {
  async function issuedToken(): Promise<string> {
    findPlayerLinkState.mockResolvedValueOnce({ tgId: null });
    return tokenFromLink((await requestLink(PUUID)).link);
  }

  it('links a registered PUUID and consumes both keys', async () => {
    const token = await issuedToken();
    findPlayerLinkState.mockResolvedValue({ tgId: null });
    setTgIdByPuuid.mockResolvedValue('Host');

    const result = await completeLink(token, TG_ID);

    expect(result).toEqual({ puuid: PUUID, tgId: TG_ID, gameName: 'Host' });
    expect(setTgIdByPuuid).toHaveBeenCalledWith(PUUID, BigInt(TG_ID));
    expect(store.size).toBe(0);
  });

  it('accepts the legacy prefixed token sent by older bots', async () => {
    const token = await issuedToken();
    findPlayerLinkState.mockResolvedValue({ tgId: null });
    setTgIdByPuuid.mockResolvedValue('Host');

    await expect(completeLink(`telegram_link:${token}`, TG_ID)).resolves.toMatchObject({
      puuid: PUUID,
    });
  });

  it('rejects an unknown or expired token', async () => {
    await expect(completeLink('missing', TG_ID)).rejects.toBeInstanceOf(LinkExpiredError);
    expect(findPlayerLinkState).not.toHaveBeenCalled();
  });

  it('rejects a used token', async () => {
    const token = await issuedToken();
    findPlayerLinkState.mockResolvedValue({ tgId: null });
    setTgIdByPuuid.mockResolvedValue('Host');
    await completeLink(token, TG_ID);

    await expect(completeLink(token, TG_ID)).rejects.toBeInstanceOf(LinkExpiredError);
  });

  it('keeps the token when the PUUID is not registered, then succeeds on retry', async () => {
    const token = await issuedToken();
    findPlayerLinkState.mockResolvedValueOnce(null);

    await expect(completeLink(token, TG_ID)).rejects.toBeInstanceOf(NotRegisteredError);
    expect(setTgIdByPuuid).not.toHaveBeenCalled();
    expect(store.get(`telegram_link:${token}`)?.value).toBe(PUUID);

    findPlayerLinkState.mockResolvedValueOnce({ tgId: null });
    setTgIdByPuuid.mockResolvedValue('Host');
    await expect(completeLink(token, TG_ID)).resolves.toMatchObject({ puuid: PUUID });
  });

  it('rejects a PUUID that was linked in the meantime', async () => {
    const token = await issuedToken();
    findPlayerLinkState.mockResolvedValue({ tgId: 42n });

    await expect(completeLink(token, TG_ID)).rejects.toBeInstanceOf(AlreadyLinkedError);
    expect(setTgIdByPuuid).not.toHaveBeenCalled();
  });

  it('maps a duplicate Telegram id (P2002) and keeps the token', async () => {
    const token = await issuedToken();
    findPlayerLinkState.mockResolvedValue({ tgId: null });
    setTgIdByPuuid.mockRejectedValue(prismaError('P2002'));

    await expect(completeLink(token, TG_ID)).rejects.toBeInstanceOf(TgAlreadyLinkedError);
    expect(store.has(`telegram_link:${token}`)).toBe(true);
  });

  it('maps a row removed before the update (P2025) to NOT_REGISTERED', async () => {
    const token = await issuedToken();
    findPlayerLinkState.mockResolvedValue({ tgId: null });
    setTgIdByPuuid.mockRejectedValue(prismaError('P2025'));

    await expect(completeLink(token, TG_ID)).rejects.toBeInstanceOf(NotRegisteredError);
  });

  it('rethrows unexpected database errors', async () => {
    const token = await issuedToken();
    findPlayerLinkState.mockResolvedValue({ tgId: null });
    setTgIdByPuuid.mockRejectedValue(new Error('connection lost'));

    await expect(completeLink(token, TG_ID)).rejects.toThrow('connection lost');
  });
});
