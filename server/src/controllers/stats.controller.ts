import type { Request, Response } from 'express';
import {
  getAllTimeStats,
  getAverageStats,
  getChampionStats,
  getDateStats,
  getTopmostStats,
  parseStatsDate,
} from '../services/stats.service.js';

/**
 * Parse Telegram user id from query. Query values arrive as strings.
 * Accepts positive safe integers only (same range as user link completion).
 */
function parseTgIdQuery(req: Request): bigint | null {
  const raw = req.query.tgId;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const asNumber = Number(trimmed);
  if (!Number.isSafeInteger(asNumber) || asNumber <= 0) return null;
  return BigInt(trimmed);
}

function parseChampionIdQuery(req: Request): number | null {
  const raw = req.query.championId;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const championId = Number(trimmed);
  if (!Number.isSafeInteger(championId) || championId <= 0) return null;
  return championId;
}

function parseDateQuery(req: Request): string | null {
  const raw = req.query.date;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function sendStatsResult(
  res: Response,
  load: () => Promise<object | null>,
) {
  try {
    const stats = await load();
    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    return res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
}

async function getAllTimeStatsController(req: Request, res: Response) {
  const tgId = parseTgIdQuery(req);
  if (tgId === null) {
    return res.status(400).json({ error: 'Query parameter "tgId" is required' });
  }
  return sendStatsResult(res, () => getAllTimeStats(tgId));
}

async function getAverageStatsController(req: Request, res: Response) {
  const tgId = parseTgIdQuery(req);
  if (tgId === null) {
    return res.status(400).json({ error: 'Query parameter "tgId" is required' });
  }
  return sendStatsResult(res, () => getAverageStats(tgId));
}

async function getTopmostStatsController(req: Request, res: Response) {
  const tgId = parseTgIdQuery(req);
  if (tgId === null) {
    return res.status(400).json({ error: 'Query parameter "tgId" is required' });
  }
  return sendStatsResult(res, () => getTopmostStats(tgId));
}

async function getChampionStatsController(req: Request, res: Response) {
  const tgId = parseTgIdQuery(req);
  if (tgId === null) {
    return res.status(400).json({ error: 'Query parameter "tgId" is required' });
  }

  const championId = parseChampionIdQuery(req);
  if (championId === null) {
    return res
      .status(400)
      .json({ error: 'Query parameter "championId" is required' });
  }

  return sendStatsResult(res, () => getChampionStats(tgId, championId));
}

async function getDateStatsController(req: Request, res: Response) {
  const tgId = parseTgIdQuery(req);
  if (tgId === null) {
    return res.status(400).json({ error: 'Query parameter "tgId" is required' });
  }

  const date = parseDateQuery(req);
  if (date === null) {
    return res.status(400).json({ error: 'Query parameter "date" is required' });
  }
  if (!parseStatsDate(date)) {
    return res.status(400).json({ error: 'Invalid date; expected yy/mm/dd' });
  }

  return sendStatsResult(res, () => getDateStats(tgId, date));
}

export {
  parseTgIdQuery,
  parseChampionIdQuery,
  parseDateQuery,
  getAllTimeStatsController,
  getAverageStatsController,
  getTopmostStatsController,
  getChampionStatsController,
  getDateStatsController,
};
