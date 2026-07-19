import type { Request, Response } from 'express';
import {
  getAllTimeStats,
  getDetailedStats,
  getRecentStats,
} from '../services/stats.service.js';

function parsePuuidQuery(req: Request): string | null {
  const raw = req.query.puuid;
  if (typeof raw !== 'string') return null;
  const puuid = raw.trim();
  return puuid.length > 0 ? puuid : null;
}

async function getAllTimeStatsController(req: Request, res: Response) {
  const puuid = parsePuuidQuery(req);
  if (!puuid) {
    return res.status(400).json({ error: 'Query parameter "puuid" is required' });
  }

  try {
    const stats = await getAllTimeStats(puuid);
    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    return res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
}

async function getRecentStatsController(req: Request, res: Response) {
  const puuid = parsePuuidQuery(req);
  if (!puuid) {
    return res.status(400).json({ error: 'Query parameter "puuid" is required' });
  }

  try {
    const stats = await getRecentStats(puuid);
    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    return res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
}

async function getDetailedStatsController(req: Request, res: Response) {
  const puuid = parsePuuidQuery(req);
  if (!puuid) {
    return res.status(400).json({ error: 'Query parameter "puuid" is required' });
  }

  try {
    const stats = await getDetailedStats(puuid);
    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    return res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
}

export {
  parsePuuidQuery,
  getAllTimeStatsController,
  getRecentStatsController,
  getDetailedStatsController,
};
