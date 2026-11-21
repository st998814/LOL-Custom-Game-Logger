import express from 'express';

import { pingPostgres } from '../db/prisma.js';
import { pingRedis } from '../db/redis.js';

const router = express.Router();

/**
 * Liveness: process is up. Do not check dependencies here — a transient
 * Postgres/Redis blip must not restart the container in a loop.
 */
router.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Readiness: API can serve traffic that needs Postgres + Redis (linking).
 */
router.get('/readyz', async (_req, res) => {
  const [postgres, redis] = await Promise.all([pingPostgres(), pingRedis()]);

  if (postgres && redis) {
    return res.status(200).json({ status: 'ready', postgres, redis });
  }

  return res.status(503).json({ status: 'not_ready', postgres, redis });
});

export default router;
