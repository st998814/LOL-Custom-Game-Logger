import type { Request, Response } from 'express';
import { InvalidInputError, UserLinkError } from '../errors/user.errors.js';
import { completeLink, getAccountStatus, requestLink } from '../services/user.service.js';

function requireString(value: unknown, field: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length === 0) {
    throw new InvalidInputError(`"${field}" is required`);
  }
  return text;
}

function requireTgId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new InvalidInputError('"tgId" must be a positive integer');
  }
  return value;
}

function sendError(res: Response, error: unknown) {
  if (error instanceof UserLinkError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  console.error('User endpoint failed', error);
  return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
}

/** GET /api/user/status?puuid= */
async function getAccountStatusController(req: Request, res: Response) {
  try {
    const puuid = requireString(req.query.puuid, 'puuid');
    return res.status(200).json(await getAccountStatus(puuid));
  } catch (error) {
    return sendError(res, error);
  }
}

/** POST /api/user/link { puuid } */
async function requestLinkController(req: Request, res: Response) {
  try {
    const puuid = requireString(req.body?.puuid, 'puuid');
    return res.status(200).json(await requestLink(puuid));
  } catch (error) {
    return sendError(res, error);
  }
}

/** POST /api/user/link/complete { token, tgId } */
async function completeLinkController(req: Request, res: Response) {
  try {
    const token = requireString(req.body?.token, 'token');
    const tgId = requireTgId(req.body?.tgId);
    return res.status(200).json(await completeLink(token, tgId));
  } catch (error) {
    return sendError(res, error);
  }
}

export { getAccountStatusController, requestLinkController, completeLinkController };
