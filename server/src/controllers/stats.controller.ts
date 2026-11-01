import type { Request, Response } from 'express';
import { getAllTimeStats } from '../services/stats.service.js';

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

async function getAllTimeStatsController(req: Request, res: Response) {
  const tgId = parseTgIdQuery(req);
  if (tgId === null) {
    return res.status(400).json({ error: 'Query parameter "tgId" is required' });
  }

  try {
    const stats = await getAllTimeStats(tgId);
    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    return res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
}

export { parseTgIdQuery, getAllTimeStatsController };
