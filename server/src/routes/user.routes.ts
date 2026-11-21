import express from 'express';
import {
  completeLinkController,
  getAccountStatusController,
  requestLinkController,
} from '../controllers/user.controller.js';
import { agentReadWriteRateLimiter } from '../middleware/agentRateLimit.js';
import { requireAgentApiKey } from '../middleware/requireAgentApiKey.js';

const router = express.Router();

router.get(
  '/status',
  requireAgentApiKey,
  agentReadWriteRateLimiter,
  getAccountStatusController,
);
router.post(
  '/link',
  requireAgentApiKey,
  agentReadWriteRateLimiter,
  requestLinkController,
);
router.post('/link/complete', completeLinkController);

// Deprecated: kept for capture agents and bots released before the rename.
router.post(
  '/register/link',
  requireAgentApiKey,
  agentReadWriteRateLimiter,
  requestLinkController,
);
router.post('/register/link/complete', completeLinkController);

export default router;
