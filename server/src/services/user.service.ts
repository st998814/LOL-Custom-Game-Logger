import crypto from 'node:crypto';
import redisClient from '../db/redis.js';
import {
  AlreadyLinkedError,
  LinkExpiredError,
  NotRegisteredError,
  TgAlreadyLinkedError,
} from '../errors/user.errors.js';
import { findPlayerLinkState, setTgIdByPuuid } from '../models/user.model.js';
import type { AccountStatus, LinkCompleted, LinkTicket } from '../types/type.user.js';

const LINK_TTL_SECONDS = 600;
const DEFAULT_BOT_USERNAME = 'Dev962299Bot';
const TOKEN_KEY_PREFIX = 'telegram_link:';

function botUsername(): string {
  return process.env.TELEGRAM_BOT_USERNAME || DEFAULT_BOT_USERNAME;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function tokenKey(token: string): string {
  return `${TOKEN_KEY_PREFIX}${token}`;
}

function puuidKey(puuid: string): string {
  return `${TOKEN_KEY_PREFIX}puuid:${puuid}`;
}

function buildLink(token: string): string {
  return `https://t.me/${botUsername()}?start=${token}`;
}

// Older bots send the full Redis key instead of the bare token.
function normalizeToken(token: string): string {
  return token.startsWith(TOKEN_KEY_PREFIX) ? token.slice(TOKEN_KEY_PREFIX.length) : token;
}

async function getAccountStatus(puuid: string): Promise<AccountStatus> {
  const state = await findPlayerLinkState(puuid);
  return { registered: state !== null, linked: state?.tgId != null };
}

/** Returns the PUUID's live token, or creates one. Two concurrent callers get the same token. */
async function reuseOrCreateToken(puuid: string): Promise<string> {
  const existing = await redisClient.get(puuidKey(puuid));
  if (existing) {
    if ((await redisClient.ttl(tokenKey(existing))) > 0) {
      return existing;
    }
    await redisClient.del(puuidKey(puuid)); // stale reverse key without a token
  }

  const token = generateToken();
  const expiration = { type: 'EX', value: LINK_TTL_SECONDS } as const;
  await redisClient.set(tokenKey(token), puuid, { expiration });
  const claimed = await redisClient.set(puuidKey(puuid), token, { expiration, condition: 'NX' });
  if (claimed === 'OK') {
    return token;
  }

  // Another request claimed the PUUID first: use its token and drop ours.
  const winner = await redisClient.get(puuidKey(puuid));
  if (!winner) {
    await redisClient.set(puuidKey(puuid), token, { expiration });
    return token;
  }
  await redisClient.del(tokenKey(token));
  return winner;
}

/**
 * Issues a Telegram deep link for an unlinked PUUID. Registration is not
 * required: the agent asks right after ingest, before the worker writes the row.
 */
async function requestLink(puuid: string): Promise<LinkTicket> {
  const state = await findPlayerLinkState(puuid);
  if (state?.tgId != null) {
    throw new AlreadyLinkedError();
  }

  const token = await reuseOrCreateToken(puuid);
  const ttl = await redisClient.ttl(tokenKey(token));
  return {
    status: 'pending',
    link: buildLink(token),
    expiresIn: ttl > 0 ? ttl : LINK_TTL_SECONDS,
  };
}

/**
 * Binds the Telegram id to the token's PUUID. Registration is enforced here:
 * an unregistered PUUID keeps its token so the user can retry once the
 * worker has persisted the game.
 */
async function completeLink(token: string, tgId: number): Promise<LinkCompleted> {
  const key = tokenKey(normalizeToken(token));
  const puuid = await redisClient.get(key);
  if (!puuid) {
    throw new LinkExpiredError();
  }

  const state = await findPlayerLinkState(puuid);
  if (state === null) {
    throw new NotRegisteredError();
  }
  if (state.tgId != null) {
    throw new AlreadyLinkedError();
  }

  let gameName: string | null;
  try {
    gameName = await setTgIdByPuuid(puuid, BigInt(tgId));
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'P2002') throw new TgAlreadyLinkedError();
    if (code === 'P2025') throw new NotRegisteredError();
    throw error;
  }

  await redisClient.del([key, puuidKey(puuid)]);
  return { puuid, tgId, gameName };
}

export { getAccountStatus, requestLink, completeLink, LINK_TTL_SECONDS };
