import express from 'express';
import receiveRawEventController from '../controllers/data.controller.js';
import { ingestRateLimiter } from '../middleware/agentRateLimit.js';
import { requireAgentApiKey } from '../middleware/requireAgentApiKey.js';

const router = express.Router();

// Lightweight ingestion endpoint – stores raw payloads only
router.post(
  '/events',
  requireAgentApiKey,
  ingestRateLimiter,
  receiveRawEventController,
);

export default router;
